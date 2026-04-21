---
title: '백엔드 개발자를 위한 쿠버네티스 (1): 기본 개념과 배포 플로우'
date: 2026-04-21
description: Pod, Deployment, Service, Ingress가 실제로 어떻게 엮이는지. 그리고 kubectl apply 이후 일어나는 일.
tags: [kubernetes, k8s, devops, backend, infra]
category: infra
series: 백엔드 개발자를 위한 쿠버네티스
seriesOrder: 1
published: true
---

도커로 백엔드 앱을 컨테이너로 만들어 배포해본 적이 있다면, 흐름은 익숙할 거다. `docker build`, `docker push`, 그리고 VM에 SSH로 붙어 `docker run`. 서비스 하나일 땐 이걸로 충분하다.

문제는 서비스가 늘어나는 시점에서 시작된다. 컨테이너가 죽으면 누가 다시 띄우는가. 트래픽이 늘면 복제본은 어떻게 확장하는가. 이미지만 바꿔 다운타임 없이 교체하고 싶다면. 이 질문들에 매번 셸 스크립트와 systemd 유닛으로 대응하다 보면, 그게 곧 엉성한 자작 오케스트레이터가 된다. 쿠버네티스(Kubernetes, 이하 K8s)는 이 영역을 선언적으로 다루기 위해 만들어졌다.

## 핵심 오브젝트

K8s 오브젝트는 모두 YAML로 선언한다. "원하는 상태"를 적으면, 컨트롤러가 실제 상태를 거기에 맞추는 구조다.

### 포드(Pod)

컨테이너를 실행하는 가장 작은 단위. 포드 안에 컨테이너가 여러 개 들어가기도 하지만, 실무에선 보통 하나다.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: api
spec:
  containers:
    - name: api
      image: myorg/api:1.0.0
      ports:
        - containerPort: 8080
```

Pod을 직접 만드는 일은 거의 없다. 죽으면 다시 안 뜬다. 그래서 위에 컨트롤러가 붙는다.

### ReplicaSet과 디플로이먼트(Deployment)

ReplicaSet은 "Pod을 N개 유지하라"를 책임진다. 죽으면 새로 띄우고, 많으면 줄인다. 하지만 ReplicaSet도 직접 쓰는 일은 드물다. 이미지 업데이트, 롤링 배포, 롤백까지 포함하는 Deployment를 쓴다.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: myorg/api:1.0.0
```

Deployment는 내부적으로 ReplicaSet을 만들고, 이미지 태그가 바뀌면 새 ReplicaSet을 하나 더 만든다. 그리고 기존 Pod을 점진적으로 새 Pod으로 교체한다.

### Service

Pod은 생성과 삭제가 잦다. 재스케줄될 때마다 IP가 바뀐다. 안정적인 접근점을 두기 위해 Service가 필요하다.

- ClusterIP: 기본값. 클러스터 내부에서만 접근 가능
- NodePort: 각 노드의 특정 포트로 노출. 개발/테스트용
- LoadBalancer: 클라우드 LB를 자동으로 생성. 외부 노출용

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api
spec:
  type: ClusterIP
  selector:
    app: api
  ports:
    - port: 80
      targetPort: 8080
```

### Ingress

외부 HTTP(S) 트래픽을 여러 Service로 라우팅한다. 도메인, 경로 기반 라우팅, TLS 종단이 가능하다. LoadBalancer Service를 여러 개 띄우는 대신 Ingress 하나로 묶으면 비용과 운영 부담이 줄어든다. 단, Ingress Controller(nginx, Traefik 등)를 클러스터에 먼저 설치해둬야 동작한다.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
spec:
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api
                port:
                  number: 80
```

### ConfigMap과 Secret

둘 다 Pod에 설정값을 주입하는 오브젝트다. ConfigMap은 일반 설정(`LOG_LEVEL` 같은), Secret은 민감 정보(DB 패스워드, API 키) 용도. 단, Secret은 이름만큼 안전하지 않다. 기본값은 base64 인코딩일 뿐이고, etcd 암호화와 RBAC를 제대로 잡아야 비밀 저장소답게 쓸 수 있다.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-config
data:
  LOG_LEVEL: info
---
apiVersion: v1
kind: Secret
metadata:
  name: api-secret
type: Opaque
stringData:
  DB_PASSWORD: changeme
```

## kubectl apply 이후 일어나는 일

`kubectl apply -f deployment.yaml` 한 줄 뒤에서 실제로 벌어지는 일은 이렇다.

1. kubectl이 YAML을 읽어 API Server로 HTTP 요청을 보낸다
2. API Server가 인증/인가/유효성 검사를 거친 뒤, etcd에 "이런 Deployment가 필요함"을 기록한다
3. Deployment Controller가 etcd 변화를 감지한다. 원하는 replicas 수만큼 ReplicaSet을 생성하거나 업데이트한다
4. ReplicaSet Controller가 부족한 수만큼 Pod 오브젝트를 만든다. 이 시점의 Pod은 아직 어느 노드에 배정될지 정해지지 않은 Pending 상태다
5. Scheduler가 Pending Pod을 보고, 각 노드의 자원 여유와 제약 조건을 따져 노드를 고른다. Pod spec의 `nodeName`이 채워진다
6. 해당 노드의 kubelet이 "내 노드에 Pod이 배정됐다"를 인지하고, 컨테이너 런타임(containerd 등)에게 이미지 pull과 컨테이너 실행을 요청한다
7. kubelet은 Pod 상태를 주기적으로 API Server에 보고한다. `kubectl get pods`로 보이는 상태가 이 값이다

사용자는 "원하는 상태"를 선언할 뿐이고, 각 컴포넌트는 각자의 책임을 수행하며 루프를 돈다. 단일 책임을 가진 컨트롤러들이 실제 상태를 원하는 상태에 수렴시키는 이 모델을 reconciliation loop라고 부른다. 각자 역할이 분리돼 있기 때문에 한 컴포넌트가 잠깐 죽어도 회복이 가능하다.

## 첫 번째 배포 예시

Go 1.22로 만든 API와 PostgreSQL을 띄운다고 해보자. 먼저 API 쪽은 오브젝트 네 개로 구성된다.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-config
data:
  DB_HOST: postgres
  DB_NAME: appdb
  LOG_LEVEL: info
---
apiVersion: v1
kind: Secret
metadata:
  name: api-secret
type: Opaque
stringData:
  DB_PASSWORD: changeme
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: myorg/api:1.0.0
          ports:
            - containerPort: 8080
          envFrom:
            - configMapRef:
                name: api-config
            - secretRef:
                name: api-secret
---
apiVersion: v1
kind: Service
metadata:
  name: api
spec:
  type: ClusterIP
  selector:
    app: api
  ports:
    - port: 80
      targetPort: 8080
```

`envFrom`으로 ConfigMap과 Secret의 값이 컨테이너 환경변수에 통째로 주입된다. Go 코드에선 `os.Getenv("DB_HOST")`로 읽으면 된다.

PostgreSQL 쪽은 조금 다르다. 상태(데이터)가 있는 컴포넌트는 Deployment 대신 StatefulSet을 쓰고, 데이터 볼륨은 PersistentVolumeClaim으로 연결한다. 운영 환경이라면 K8s 안에 DB를 두지 않고 관리형 서비스(RDS, Cloud SQL)로 분리하는 선택도 흔하다. 이 주제는 독립된 한 편 분량이라 여기선 다루지 않는다.

배포는 한 줄이다.

```bash
kubectl apply -f app.yaml
```

상태 확인은 이 정도면 충분하다.

```bash
kubectl get pods,svc
kubectl logs deploy/api
kubectl describe pod <pod-name>
```

## 다음 편

여기까지가 기본이다. 그런데 오브젝트가 10개, 20개로 늘면 YAML 관리가 지저분해진다. 환경별(dev/staging/prod)로 값만 다르게 가져가고 싶을 때, 같은 템플릿을 반복하고 싶을 때, 릴리스 버전을 관리하고 싶을 때. 다음 편은 Helm이다. K8s 매니페스트를 패키지로 묶고 템플릿화하는 방식, 그리고 실전에서 자주 부딪히는 함정들을 다룬다.

## 참고 자료

- [Kubernetes Documentation: Concepts](https://kubernetes.io/docs/concepts/): 공식 개념 문서. Workloads와 Services 섹션이 입문용으로 가장 낫다
- [Kubernetes Documentation: Components](https://kubernetes.io/docs/concepts/overview/components/): 컨트롤 플레인 구성 요소 정리
- [Kubernetes Documentation: Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/): 롤링 업데이트와 롤백 동작 디테일
- [Kubernetes Documentation: Services](https://kubernetes.io/docs/concepts/services-networking/service/): Service 타입별 내부 동작
- [Kubernetes Documentation: Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/): Ingress 규칙과 Controller 설명
