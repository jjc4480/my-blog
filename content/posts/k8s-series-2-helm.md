---
title: '백엔드 개발자를 위한 쿠버네티스 (2): Helm 차트로 앱 패키징'
date: 2026-04-21
description: 생 YAML의 한계, Chart 구조, values.yaml로 환경 분리까지. 실전에서 Helm을 어떻게 쓰는지.
tags: [kubernetes, helm, devops, backend, infra]
category: infra
series: 백엔드 개발자를 위한 쿠버네티스
seriesOrder: 2
published: true
---

## 왜 Helm인가

1편에서 Go 1.22 API를 띄우기 위해 ConfigMap, Secret, Deployment, Service 네 개 오브젝트를 작성했다. 여기에 Ingress까지 더하면 다섯 개. 이걸 dev/stg/prod 세 환경에 똑같이 돌리려면 YAML이 15개가 된다. 서비스가 세 개만 돼도 45개. 금방 한 디렉토리 안에서 길을 잃는다.

환경마다 다른 건 몇 개뿐이다. `replicas`, 이미지 태그, DB 호스트, 로그 레벨. 나머지는 똑같다. 그런데도 파일을 복사하는 순간 "prod에만 빠진 환경변수 하나" 같은 사고가 생긴다. sed로 치환하는 셸 스크립트를 짜기 시작하면, 그게 곧 엉성한 템플릿 엔진이다. 그리고 버저닝이 없다. 어제 apply한 매니페스트가 뭐였는지, 어느 시점 상태로 되돌릴지 기록이 없으면 운영이 불안해진다.

Helm은 쿠버네티스용 패키지 매니저다. 매니페스트를 템플릿으로 묶고, 환경별 값을 외부에서 주입하고, 설치와 업그레이드와 롤백을 릴리스 단위로 관리한다. 차트(Chart)라는 패키지 단위, 릴리스(Release)라는 설치 단위. 이 두 개념만 잡으면 나머지는 명령어 몇 개에 불과하다. apt나 npm을 떠올리면 감각이 맞다. 차이라면 설치 대상이 로컬 머신이 아니라 쿠버네티스 클러스터라는 점.

## Chart 구조

`helm create api` 한 줄이면 뼈대가 생긴다.

```
api/
├── Chart.yaml
├── values.yaml
├── charts/
└── templates/
    ├── deployment.yaml
    ├── service.yaml
    ├── configmap.yaml
    ├── secret.yaml
    └── _helpers.tpl
```

- `Chart.yaml`: 차트 메타데이터. 이름, 차트 자체의 버전(`version`), 담긴 앱의 버전(`appVersion`). 두 버전을 혼동하기 쉬운데, 차트 버전은 템플릿 구조가 바뀔 때, appVersion은 앱 이미지 태그가 바뀔 때 올린다
- `values.yaml`: 기본값 모음. 템플릿이 참조하는 변수들의 원본이고, 사용자 입장에선 이 파일이 차트의 공개 API에 해당한다
- `templates/`: Go template 문법이 섞인 매니페스트들. 각 파일은 렌더링 후 쿠버네티스 오브젝트 하나 이상이 된다
- `charts/`: 서브차트가 들어가는 자리. `helm dependency update`로 채워진다
- `_helpers.tpl`: 공통 템플릿 조각. 이름 생성 규칙, 라벨 세트 같은 재사용 요소를 한 군데 모은다

규칙은 단순하다. `helm install`이 돌면 Helm이 `templates/` 아래 파일을 렌더링해서 kubectl apply 상당의 동작을 한다. 렌더링 결과는 `helm template` 명령으로 미리 확인할 수 있다. 템플릿 문법 실수로 이상한 YAML이 나오는 사고는 대부분 이 명령으로 사전에 잡힌다.

## Template 동작

1편에서 쓴 Deployment YAML을 템플릿으로 옮기면 이렇게 된다.

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}-api
  labels:
    app: {{ .Release.Name }}-api
spec:
  replicas: {{ .Values.api.replicas }}
  selector:
    matchLabels:
      app: {{ .Release.Name }}-api
  template:
    metadata:
      labels:
        app: {{ .Release.Name }}-api
    spec:
      containers:
        - name: api
          image: "{{ .Values.api.image.repository }}:{{ .Values.api.image.tag }}"
          ports:
            - containerPort: {{ .Values.api.containerPort }}
          envFrom:
            - configMapRef:
                name: {{ .Release.Name }}-api-config
            - secretRef:
                name: {{ .Release.Name }}-api-secret
```

중괄호 `{{ ... }}` 안은 Go template 문법이다. 단순 값 치환뿐 아니라 `if`, `range`, 함수 호출, 파이프라인까지 된다. 가령 선택적으로 Ingress를 만들고 싶다면 `{{- if .Values.ingress.enabled }} ... {{- end }}`로 블록을 감싸는 식이다. 또 자주 만나는 실수 하나. YAML은 들여쓰기에 민감한데, 템플릿 제어문이 남긴 빈 줄이 YAML 구조를 깨뜨리기도 한다. 제어문 앞에 `{{-` 처럼 하이픈을 붙이면 앞 공백을 정리해준다.

자주 쓰는 내장 객체는 네 개.

- `.Values`: `values.yaml`에서 읽어온 사용자 값
- `.Release`: 이번 설치의 이름, 네임스페이스
- `.Chart`: `Chart.yaml`의 값
- `.Files`: 차트에 함께 묶인 정적 파일 접근

이 중 `.Release.Name`을 리소스 이름 앞에 붙이는 관습이 중요하다. 같은 차트를 한 클러스터에서 dev/stg 두 릴리스로 돌릴 때, 이름 충돌을 막는 기본 장치다. 네임스페이스로 격리하더라도 릴리스 이름을 접두어로 쓰는 패턴은 유지하는 게 안전하다. 나중에 한 네임스페이스로 합칠 수도 있고, 로그나 지표에서 리소스 출처를 식별할 때도 도움이 된다.

`values.yaml`은 이렇다.

```yaml
api:
  replicas: 2
  image:
    repository: myorg/api
    tag: 1.0.0
  containerPort: 8080
  config:
    LOG_LEVEL: info
    DB_HOST: postgres
  secret:
    DB_PASSWORD: changeme
```

## 환경 분리

환경별로 다른 값만 별도 파일로 뺀다.

```yaml
# values-prod.yaml
api:
  replicas: 5
  image:
    tag: 1.4.2
  config:
    LOG_LEVEL: warn
    DB_HOST: prod-postgres.internal
```

설치 명령에서 파일을 덧붙여 주입한다.

```bash
helm install api ./api -f values-prod.yaml
```

`-f` 뒤쪽에 오는 파일이 앞 파일을 덮어쓴다. 기본값은 `values.yaml`에 두고, 환경별 파일에는 차이 나는 값만 적는 게 원칙이다. `values-prod.yaml`이 너무 두꺼워지면 기본값 구조가 잘못된 것. 공통을 기본값으로 끌어올려야 한다.

병합 규칙은 맵은 깊게, 리스트는 얕게다. 맵 안의 개별 키는 나중 파일 값이 우선하고, 나머지는 그대로 유지된다. 하지만 리스트는 통째로 교체된다. `env` 같은 배열을 다룰 땐 이 차이를 잊으면 실수한다. 배열이 많이 들어가는 차트라면 애초에 값 구조를 맵으로 설계하는 편이 낫다.

한 값만 임시로 바꿔보고 싶을 땐 파일 대신 `--set` 플래그로 주입하기도 한다. CI 스크립트에서 이미지 태그만 올릴 때 자주 쓰는 패턴이다.

```bash
helm upgrade api ./api -f values-prod.yaml --set api.image.tag=1.4.3
```

## install, upgrade, rollback

릴리스는 이 세 동사로 굴러간다.

```bash
helm install api ./api -f values-prod.yaml
helm upgrade api ./api -f values-prod.yaml
helm rollback api 3
helm history api
helm uninstall api
```

`install`은 새 릴리스를 만든다. 같은 이름으로 다시 install하면 실패한다. 두 번째부터는 `upgrade`다. 매번의 upgrade는 revision 번호를 부여받고, `helm history`로 과거 버전을 볼 수 있다. 문제가 생기면 `rollback <이름> <revision>`으로 직전 상태로 되돌아간다. revision은 values 변경과 차트 변경 둘 다를 기록하기 때문에, 설정값 실수로 인한 사고도 rollback으로 복구된다.

내부 구현은 단순하다. Helm은 릴리스 상태를 쿠버네티스 Secret에 저장한다. 이 Secret이 기록이고, rollback은 저장된 과거 매니페스트를 다시 apply하는 과정이다. 특별한 마법이 있는 건 아니다. 그래서 Helm이 설치한 리소스라도 누군가 kubectl로 직접 수정하면 상태가 어긋난다. 사람이 클러스터에 들어가 손으로 고치지 않는 규율이 같이 가야 Helm의 장점이 살아난다.

## 의존성: PostgreSQL을 서브차트로

1편에선 PostgreSQL을 "따로 다룬다"고 미뤄뒀다. Helm에선 외부 차트를 의존성으로 가져와 자기 차트에 끼워 넣을 수 있다. Bitnami의 PostgreSQL 차트를 예로 들면 `Chart.yaml`에 이렇게 선언한다.

```yaml
apiVersion: v2
name: api
version: 0.1.0
appVersion: 1.0.0
dependencies:
  - name: postgresql
    version: 15.5.0
    repository: https://charts.bitnami.com/bitnami
```

그 뒤에 명령 두 줄.

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm dependency update ./api
```

`charts/` 디렉토리에 `postgresql-15.5.0.tgz`가 들어온다. 이제 `helm install` 한 번이면 API와 PostgreSQL이 함께 설치된다. 서브차트의 값은 `values.yaml` 안에서 서브차트 이름을 키로 삼아 오버라이드한다.

```yaml
postgresql:
  auth:
    database: appdb
    username: appuser
```

운영 환경에서 DB를 관리형 서비스로 쓴다면 서브차트 대신 외부 호스트를 값으로 주입하는 쪽이 낫다. 그 경우 `postgresql.enabled: false` 같은 플래그로 차트 단위의 스위치를 두는 관습이 흔하다.

서브차트를 가볍게 쓰기 시작하면 빠르게 복잡해진다. 차트마다 들어간 라벨, 네임스페이스, 기본 리소스 설정이 서로 충돌하거나 중복된다. 그래서 팀 차트의 기본 패턴은 "내 앱은 직접 관리하고, 외부 컴포넌트는 서브차트로 참조만 한다"에 가깝다. 모놀리식 하나에 모든 걸 때려 넣는 메가 차트는 초반엔 편해도 운영하면 금세 무거워진다.

## 다음 편

여기까지면 차트 하나로 앱과 그 의존까지 함께 다룰 수 있다. 그런데 실전에서는 또 다른 문제가 생긴다. `helm upgrade`를 누가 언제 실행하는가. Git에 `values-prod.yaml`을 커밋했는데 클러스터에는 다른 값이 돌고 있다면 어떻게 감지하는가. 이 지점에서 GitOps가 들어온다.

다음 편은 ArgoCD다. Git 저장소를 단일 소스 오브 트루스로 두고, 클러스터 상태를 자동으로 맞추는 방식. Helm과 어떻게 맞물리는지, ArgoCD Application 리소스가 `helm upgrade`를 어떻게 대체하는지, 그리고 흔한 함정 몇 가지를 다룬다.

## 참고 자료

- [Helm Documentation: Charts](https://helm.sh/docs/topics/charts/): Chart 구조와 필드 레퍼런스
- [Helm Documentation: Chart Template Guide](https://helm.sh/docs/chart_template_guide/): template 문법과 `.Values`, `.Release` 등 내장 객체 설명
- [Helm Documentation: Chart Dependencies](https://helm.sh/docs/topics/charts/#chart-dependencies): 서브차트와 `dependency update` 동작
- [Helm Documentation: Using Helm](https://helm.sh/docs/intro/using_helm/): install/upgrade/rollback 흐름
- [Bitnami PostgreSQL Chart](https://github.com/bitnami/charts/tree/main/bitnami/postgresql): 실전에서 자주 쓰이는 DB 서브차트
