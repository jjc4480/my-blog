---
title: '백엔드 개발자를 위한 쿠버네티스 (3): ArgoCD로 GitOps 자동 배포'
date: 2026-04-21
description: helm upgrade를 누가 누를지 정해야 하는 문제. ArgoCD App, sync 정책, 실제 운영 패턴.
tags: [kubernetes, argocd, gitops, devops, backend, infra]
category: infra
series: 백엔드 개발자를 위한 쿠버네티스
seriesOrder: 3
published: true
---

## helm upgrade를 누가 누를 것인가

2편에서 Helm 차트로 앱을 패키징했다. 이제 배포는 `helm upgrade api ./api -f values-prod.yaml` 한 줄이다. 문제는 이 한 줄을 누가, 언제, 어떤 머신에서 실행하느냐다.

초기엔 개발자가 자기 노트북에서 그냥 친다. 곧 문제가 생긴다. A가 올린 값과 B가 올린 값이 엇갈린다. 어제 prod에 들어간 `values-prod.yaml`이 지금 레포에 있는 파일과 같은지 확인할 길이 없다. 누군가 `--set` 플래그로 임시 패치를 올리고 Git에는 반영하지 않는 일도 생긴다. 새로 들어온 사람은 어느 머신에서, 어느 kubeconfig로, 어떤 순서로 배포해야 하는지 구전으로 배운다. 배포 이력을 찾으려면 셸 히스토리와 Slack을 뒤진다. Git과 클러스터가 서로 다른 진실을 말하기 시작하면 운영은 점점 흔들린다.

GitOps의 아이디어는 단순하다. 클러스터의 desired state를 Git에 적고, 그 Git 레포를 유일한 진실로 삼는다. 사람이 `kubectl`이나 `helm upgrade`를 직접 치지 않는다. 대신 컨트롤러가 Git을 감시하다가, 변경이 들어오면 클러스터 상태를 Git에 맞춘다. ArgoCD가 그 컨트롤러다.

## ArgoCD 기본 개념

ArgoCD는 쿠버네티스에 설치되는 별도 컨트롤러다. 설치 자체도 Helm이나 매니페스트 한 세트를 apply하는 방식이다. 설치되고 나면 웹 UI와 `argocd` CLI 두 가지 인터페이스를 제공하고, 둘 다 내부적으로는 쿠버네티스 API의 커스텀 리소스를 읽고 쓴다.

설치 직후 몇 개의 커스텀 리소스가 새로 생긴다.

- Application: 배포할 단위. "이 Git 경로에 있는 매니페스트/차트를, 이 클러스터의 이 네임스페이스에 적용해라"라는 선언
- AppProject: Application 여러 개를 묶는 프로젝트 단위. 어느 레포, 어느 클러스터, 어느 네임스페이스에 배포해도 되는지 권한을 제한한다
- Repo, Cluster: ArgoCD가 접근할 Git 저장소와 대상 쿠버네티스 클러스터의 등록 정보

동작 원리는 간단하다. ArgoCD controller가 일정 주기로 두 상태를 비교한다. 하나는 Git의 매니페스트(desired state), 다른 하나는 클러스터에 실제로 떠 있는 오브젝트(live state). 차이가 있으면 `OutOfSync`로 표시하고, 설정에 따라 자동 또는 수동으로 sync를 실행한다. sync란 실질적으로 Git의 매니페스트를 클러스터에 apply하는 동작이다.

## 첫 Application 정의

2편에서 만든 Helm 차트가 `infra-repo`라는 Git 저장소의 `charts/api/` 경로에 있다고 하자. `values-prod.yaml`도 같은 레포에 있다. ArgoCD에 이걸 알려주는 YAML은 이렇다.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: api-prod
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/infra-repo.git
    targetRevision: main
    path: charts/api
    helm:
      valueFiles:
        - values.yaml
        - values-prod.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: prod
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

`repoURL`, `targetRevision`, `path`는 "Git 어디의 무엇을"을 가리킨다. `helm.valueFiles`는 2편에서 배운 values 파일 체인과 동일한 의미다. `destination`은 "어느 클러스터의 어느 네임스페이스"에. `syncPolicy`가 배포 규칙이다.

이 Application 리소스 자체도 YAML이므로 Git에 올려두는 게 자연스럽다. 그래야 Application 정의가 바뀐 이력도 추적된다.

## sync 정책

크게 manual과 automated 두 갈래다.

- manual: `OutOfSync`가 떠도 사람이 UI나 CLI에서 sync 버튼을 눌러야 반영된다. 안전하지만 느리다
- automated: 변경을 감지하면 자동으로 sync. 여기에 `selfHeal`과 `prune` 두 플래그가 붙는다

`selfHeal: true`면 누군가 kubectl로 클러스터를 직접 수정해도 ArgoCD가 Git 상태로 되돌린다. 수동 개입으로 인한 drift를 막는다. 단점은 급하게 수동으로 고치는 게 일시적으로도 먹히지 않는다는 것. 장애 대응 중엔 성가실 수 있다.

`prune: true`면 Git에서 삭제된 오브젝트를 클러스터에서도 삭제한다. 기본값은 false. 실수로 켜면 위험하지만, GitOps의 전제를 지키려면 대부분 true로 둬야 한다.

복잡한 순서 의존성을 가진 배포라면 `sync-wave` 애노테이션으로 오브젝트 적용 순서를 제어한다. DB 마이그레이션 Job이 먼저 끝나야 Deployment가 올라와야 하는 상황 같은 것. 애노테이션 값이 작은 쪽이 먼저 적용된다.

```yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
```

이 정도만 외워도 일반적인 배포 순서 문제는 대부분 해결된다. 프로덕션 초기에는 automated를 쓰더라도 `selfHeal: false`로 출발해 drift가 감지됐을 때 자동 복구 대신 알림만 받도록 구성하는 팀도 많다. 운영 경험이 쌓이면 self-heal을 켠다.

## 실제 운영 패턴

환경별 Application을 따로 만든다. `api-dev`, `api-stg`, `api-prod` 세 개. 각자 `values-<env>.yaml`을 참조하고, 바라보는 네임스페이스와 클러스터도 다르다. Git 브랜치 전략은 조직마다 갈리지만, 단일 `main` 브랜치에 환경별 values 파일을 함께 두고 `targetRevision`을 모두 `main`으로 고정하는 방식이 실수를 줄인다.

Application이 늘어나면 App of Apps 패턴을 쓴다. "Application들을 배포하는 루트 Application 하나"를 두는 방식이다. 루트 App이 `apps/` 디렉토리의 Application 매니페스트들을 렌더링하고, ArgoCD가 그걸 보고 자식 App들을 또 sync한다. 계층을 하나 더 올리는 셈이고, 관리할 Application이 늘수록 이점이 커진다. 환경별로 거의 동일한 Application을 양산해야 하는 경우엔 ApplicationSet을 쓴다. 리스트나 Git 디렉토리 기반으로 Application을 자동 생성한다. 새 마이크로서비스를 추가하면 디렉토리 하나 더 만들 뿐이고, Application 매니페스트를 사람이 복사하지 않는다.

실전 배포 플로우는 이렇게 정리된다.

1. 개발자가 `values-prod.yaml`에서 이미지 태그를 `1.4.3`으로 올리는 PR을 만든다
2. 리뷰와 CI 통과 후 `main`에 머지한다
3. ArgoCD가 Git 변경을 감지하고 sync를 실행한다
4. Helm 차트가 렌더링돼 `prod` 네임스페이스에 apply된다

사람이 클러스터에 직접 손을 대지 않는다. 배포의 흔적은 모두 Git 커밋 이력으로 남는다.

## 문제가 생겼을 때

`OutOfSync`는 "Git과 클러스터가 다르다"는 뜻이다. 원인은 두 가지 중 하나다. Git에서 최근 변경이 들어왔는데 아직 sync 전이거나, 클러스터에서 누군가 수동으로 오브젝트를 고쳤거나. ArgoCD UI의 diff 뷰로 어느 필드가 다른지 바로 확인된다. `argocd app diff api-prod` CLI로도 같은 정보를 볼 수 있다.

롤백은 두 층위다. ArgoCD 수준에서 이전 sync 시점으로 되돌리는 `argocd app rollback api-prod <revision>`이 하나. 이건 Helm revision과 비슷한 개념이고, Git은 그대로 둔 채 동작한다. 다른 하나는 Git 레벨의 rollback이다. 문제를 만든 커밋을 `git revert`로 되돌려 머지하면, ArgoCD가 이 변경을 감지해 sync한다. 중장기적으로는 후자가 원칙이다. Git이 유일한 진실이라는 약속을 깨지 않는다.

장애 대응 중에는 automated sync가 오히려 방해가 될 때가 있다. Git과 별개로 급하게 패치를 넣어야 하는 상황이라면 일시적으로 `syncPolicy.automated`를 비활성화하고 수동 조작으로 전환할 수 있다. 대응이 끝나면 반영 내용을 Git에 커밋하고 automated를 다시 켜서 원래 흐름으로 복귀한다. 이 때도 클러스터에만 남고 Git에 없는 변경은 남기지 않는 게 규율이다.

## 시리즈 마무리

1편에서 쿠버네티스 기본 오브젝트와 선언적 모델을 봤다. 2편에서 Helm으로 매니페스트를 패키지화했다. 3편에서는 그 차트를 Git에 올려두고, ArgoCD가 클러스터 상태를 Git에 맞추도록 했다. 세 편을 묶는 관점은 하나다. 사람이 명령을 치는 자리에 선언과 자동화를 배치한다. 배포 과정에서 사람의 손맛이 줄수록 운영은 반대로 안정적이 된다. 여기까지가 백엔드 개발자가 실전에서 마주칠 쿠버네티스의 기본 궤적이다.

## 참고 자료

- [Argo CD Documentation: Core Concepts](https://argo-cd.readthedocs.io/en/stable/core_concepts/): Application, Project, sync 등 기본 용어 정의
- [Argo CD Documentation: Getting Started](https://argo-cd.readthedocs.io/en/stable/getting_started/): 설치와 첫 Application 등록 예시
- [Argo CD Documentation: Sync Options](https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/): automated/selfHeal/prune과 sync-wave 동작
- [Argo CD Documentation: Cluster Bootstrapping](https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-bootstrapping/): App of Apps 패턴 원전 설명
- [Argo CD Documentation: ApplicationSet](https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/): 환경별 Application 자동 생성
