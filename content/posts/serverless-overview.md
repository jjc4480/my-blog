---
title: '서버리스: 개념부터 실무 활용까지'
date: 2026-04-17
description: 서버리스가 뭔지, 어디에 쓰는지, 트레이드오프는 뭔지 실무 예시와 함께 정리한다.
tags: [serverless, lambda, fargate, aws, architecture]
slug: serverless-overview
category: engineering
published: true
---

서버리스(Serverless)는 이름이 좀 모순이다. 서버가 없는 게 아니다. 서버는 있다. 내가 관리하지 않을 뿐이다.

전통 방식이면 AWS EC2 같은 가상 머신을 띄우고, Nginx 같은 웹 서버를 설치하고, 프로세스를 백그라운드로 올리고, 로그 쌓이는 걸 정리하는 설정까지 해야 한다. 서버리스에선 함수 코드 하나만 업로드한다. 나머지는 클라우드가 알아서 한다.

핵심은 실행 방식이다. 요청이 올 때만 함수가 실행되고, 끝나면 바로 종료된다. 요청이 없으면 아무것도 안 돌아간다. 요금도 실제로 실행한 만큼만 나간다.

## 전통 서버와 뭐가 다른가

| | 전통 서버 (EC2/VM) | 서버리스 (Lambda) |
|---|---|---|
| 요금 계산 | 인스턴스 켜놓은 시간 | 실행 시간 + 요청 수 |
| 확장 | 직접 설정 (오토스케일링, 수동) | 자동 |
| 요청 0일 때 | 여전히 비용 발생 | 비용 0 |
| OS/런타임 관리 | 내가 | 클라우드 |
| 실행 시간 제한 | 없음 | 있음 (Lambda 15분) |
| 상태 유지 | 가능 | 어려움 |

가장 큰 차이는 요금 계산 방식이다. EC2는 켜두면 아무것도 안 해도 돈이 나간다. Lambda는 요청이 들어와서 함수가 실행된 시간만 청구된다. 밤새 요청이 0이면 비용도 0.

그리고 확장. EC2에서 트래픽이 10배 튀면 자동 확장 그룹(Auto Scaling Group)을 미리 세팅해두거나, 수동으로 인스턴스를 늘려야 한다. Lambda는 동시 요청이 몇 개든 알아서 늘어난다. AWS가 걸어둔 동시 실행 상한에 닿을 때까지는.

책임 범위도 다르다. EC2는 OS 패치부터 런타임 업데이트, 방화벽 설정(보안 그룹)까지 내가 챙겨야 한다. Lambda는 그 아래를 전부 AWS가 관리한다. 대신 AWS가 지원하는 런타임 안에서만 돌아간다.

## 실제로 어디에 쓰나

세 가지 실무 예시로 풀어본다. 모두 AWS 기준이다.

### S3에 직접 올리게 하는 업로드 패턴 (presigned URL)

사용자가 수백 MB짜리 영상이나 이미지를 업로드하는 상황을 생각해보자. 서버가 직접 받으면 문제가 많다. 큰 파일이 서버를 통과해야 하니 네트워크 부담이 커지고, 메모리나 디스크에 잠시 담아두는 처리가 필요하고, Lambda라면 실행 시간 제한에도 금방 걸린다.

해법은 파일을 서버가 받지 않는 거다. 대신 **서명된 URL(presigned URL)**을 발급한다. 인증된 URL을 쥐어주면 클라이언트가 직접 S3에 업로드한다. 서버는 "너 이 경로로 5분 동안 올려도 돼"라고 서명만 해준다.

```js
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'node:crypto'

const s3 = new S3Client({})

export const handler = async (event) => {
  const { filename, contentType } = JSON.parse(event.body)
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const key = `uploads/${randomUUID()}-${safeFilename}`

  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: 'my-bucket',
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 300 }
  )

  return {
    statusCode: 200,
    body: JSON.stringify({ url, key }),
  }
}
```

클라이언트는 이 URL에 `PUT` 요청으로 파일을 직접 올린다. Lambda는 URL 발급에만 관여하니까 요청당 수십 밀리초면 끝난다.

서버리스가 잘 맞는 이유: 요청이 짧고 가볍다. 언제 몰릴지 모른다. 무엇보다 큰 파일 전송을 서버가 안 거친다. 확장 걱정이 거의 없다.

### S3 이벤트로 Lambda를 깨워 이미지/영상 후처리

대회 접수 시스템을 만들 때 이 패턴을 제대로 써먹었다. 참가자가 접수할 때 프로필 사진을 첨부하는데, 원본 그대로 올리면 배경이 제각각이라 갤러리가 지저분해 보였다. 배경을 자동으로 지워서 깔끔하게 통일하기로 했고, 그걸 Lambda로 구현했다.

전체 흐름:

1. 클라이언트가 서명된 URL로 원본을 `uploads/`에 업로드
2. S3에 파일이 올라오면 자동으로 Lambda를 깨움
3. Lambda가 이미지를 읽어서 인물만 오려내는 모델에 넘김
4. 배경이 지워진 결과물을 `processed/`에 저장

모델은 [U2Net](https://github.com/xuebinqin/U-2-Net), [BiRefNet](https://github.com/ZhengPeng7/BiRefNet) 같은 오픈소스를 썼다. 이미지에서 인물 영역만 따로 떼어내는 모델들이다. 각각 특징이 달라서 사진 결에 따라 바꿔가며 테스트했다. 모델 파일과 필요한 라이브러리는 컨테이너 이미지로 묶어 Lambda에 올렸다. 컨테이너 형태로 올리는 Lambda는 최대 10GB까지 허용되니까 머신러닝 라이브러리도 충분히 들어간다.

```js
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import { removeBackground } from './model'

const s3 = new S3Client({})

export const handler = async (event) => {
  for (const record of event.Records) {
    const { bucket, object } = record.s3

    const original = await s3.send(
      new GetObjectCommand({
        Bucket: bucket.name,
        Key: object.key,
      })
    )

    const processed = await removeBackground(original.Body)

    await s3.send(
      new PutObjectCommand({
        Bucket: 'processed-bucket',
        Key: object.key.replace('uploads/', 'processed/'),
        Body: processed,
        ContentType: 'image/png',
      })
    )
  }
}
```

이미지가 잘 돌아가니까 영상 쪽도 붙였다. 참가자가 업로드한 영상을 원본 그대로 내려주면 모바일에선 재생이 버벅였다. 그래서 영상 변환 도구인 ffmpeg를 얹은 Lambda를 하나 더 뒀다. 업로드가 끝나면 자동으로 깨어나서 1080p, 720p, 480p 세 가지 해상도로 변환한다. 60초가 넘는 영상이면 네트워크 상태에 따라 화질이 자동으로 바뀌는 스트리밍 형태(HLS)로도 같이 만든다. 짧은 영상은 거기까지 갈 필요가 없다. 그냥 다운로드로 충분하다.

Lambda에 ffmpeg를 얹는 건 손이 꽤 가지만 한 번 해두면 편하다. 업로드가 들어올 때마다 알아서 깨어나서 처리하고, 없을 땐 비용이 0이다. 영상 변환 전용 서버를 상시 띄워둘 이유가 없었다.

서버리스가 잘 맞는 이유가 여기서 더 선명해진다. 업로드가 언제 얼마나 들어올지 알 수 없다. 대회 마감 직전에 트래픽이 몰리는 건 흔한 패턴이다. 서버를 상시 띄워두면 평소엔 놀고, 피크엔 터진다. Lambda는 이벤트가 들어오는 만큼만 깨어나서 병렬로 처리한다.

주의할 부분은 **메모리와 실행 시간**이다. 인물 오려내기도 그렇고 영상 변환도 메모리를 꽤 먹는다. 128MB 기본값으로는 모델을 띄우지도 못한다. 보통 1~3GB로 잡았다. 메모리를 늘리면 CPU 할당량도 같이 늘어나서 실행 시간이 짧아지는 이득도 있다. 실행 시간 상한은 15분이다. 긴 영상을 1080p로 변환하다 보면 이 선에 닿을 수 있다. HLS 분기점을 60초로 잡은 것도 이 제약 때문이다. 이 선을 넘기는 긴 영상은 Lambda가 아니라 뒤에서 다룰 Fargate나 AWS Batch 쪽으로 넘기는 게 맞다.

### ECS Fargate: 컨테이너 기반 서버리스

Lambda로 못 풀리는 작업이 꽤 있다. 15분 안에 안 끝나는 머신러닝 추론, 수십 GB 모델을 로드해야 하는 파이프라인, 기존에 만들어둔 Docker 이미지를 그대로 돌리고 싶은 경우. 이럴 때 **ECS Fargate**가 대안이 된다.

ECS는 AWS가 제공하는 컨테이너 실행 환경이고, Fargate는 그 안에서 "호스트 서버 걱정 없이 컨테이너만 올리는" 모드다. 컨테이너 이미지와 CPU/메모리 요구량만 선언하면 AWS가 알아서 실행한다. 그래서 "서버리스 컨테이너"라고 부르기도 한다.

적합한 경우:

- 오래 걸리는 머신러닝 추론/학습 (수십 분 ~ 몇 시간)
- 기존 Docker 이미지를 손대지 않고 그대로 배포
- 대량의 배치 작업
- 상시 떠있어야 하는 API인데 EC2 관리는 하기 싫을 때

Lambda와 Fargate를 언제 쓸지는 작업 성격으로 나뉜다.

| 기준 | Lambda | Fargate |
|------|--------|---------|
| 실행 시간 | 최대 15분 | 제한 없음 |
| 과금 | 실행 시간(ms) 단위 | CPU/메모리 × 사용 시간 |
| 처음 실행 지연 | 100ms ~ 수 초 | 분 단위 (더 느림) |
| 배포 단위 | 함수 (코드 또는 컨테이너) | 컨테이너 |
| 적합한 작업 | 짧은 이벤트/API | 긴 작업, 기존 컨테이너 |

Fargate도 처음 실행될 때는 느리다. 새 태스크가 뜨려면 컨테이너 이미지를 받아오는 것부터 컨테이너가 실제로 기동되기까지 분 단위가 걸린다. 대신 한번 뜨면 계속 떠있을 수 있어서 Lambda의 시간 제약에선 벗어난다.

실무에서는 조합이 흔하다. API 게이트웨이 뒤에는 Lambda, 긴 배치나 추론은 Fargate. 이런 식으로 책임을 나눈다.

## 트레이드오프

### 장점

- 관리 부담이 거의 없다. OS 패치, 런타임 버전 올리기, 프로세스 관리. 이런 게 사라진다. 함수 코드만 올리면 끝.
- 트래픽 없을 때 비용이 0이다. 사이드 프로젝트나 개인 도구엔 특히 좋다. 월 10만 요청 이하면 사실상 공짜인 플랜도 많다.
- 자동 확장. 동시 요청이 갑자기 1000개가 들어와도 별 설정 없이 처리된다. 확장 때문에 밤에 깨는 일이 줄어든다.

### 단점

- 처음 실행이 느리다 (콜드 스타트). 함수가 처음 호출될 때는 런타임을 띄우는 데 시간이 걸린다. Node.js는 보통 200~500ms (단순 함수 기준 100ms 이하도 가능하나, 실제 앱은 200~500ms가 일반적), Java는 1~3초. 응답 속도에 민감한 API라면 문제가 된다.
- 실행 시간 제한. Lambda는 최대 15분. 긴 배치 작업은 Fargate나 AWS Batch 쪽으로 넘겨야 한다.
- 로컬 개발이 번거롭다. 클라우드 서비스와 묶여 있어서 내 컴퓨터에서 그대로 재현하기가 쉽지 않다. AWS를 흉내 내주는 LocalStack 같은 도구를 띄워야 한다. Docker Compose 한 번이면 되는 전통 서버에 비하면 피곤하다.
- 특정 플랫폼에 묶인다 (벤더 락인). Lambda 이벤트 구조, S3 이벤트 구조, AWS 권한 설정(IAM). 각 플랫폼에 종속된 코드가 생긴다. 다른 클라우드로 옮기기가 까다롭다.
- 들여다보기가 어렵다. 로그는 CloudWatch로 흩어지고, 여러 함수를 거치는 요청 흐름을 따라가려면 별도 도구를 붙여야 한다. 프로세스가 금방 사라지니 "살아있는 서버에 접속해서 보는" 방식이 통하지 않는다.

## 언제 쓰면 좋고, 언제 쓰면 안 좋은가

### 잘 맞는 경우

- 트래픽이 들쭉날쭉한 API (피크와 평시 차이 10배 이상)
- 이벤트로 시작되는 작업 (파일 업로드, 메시지 수신, 정해진 시간에 실행)
- MVP나 사이드 프로젝트 (초기 비용 부담 최소화)
- 갑자기 몰리는 트래픽 대응 (마감 직전 업로드 같은)

### 안 맞는 경우

- 항상 떠있어야 하는 상시 고트래픽 API. Lambda 요금을 계산해보면 EC2보다 3~5배 비싸지는 지점이 온다.
- 상태를 계속 들고 있어야 하는 실시간 연결. WebSocket도 가능은 하지만 API Gateway WebSocket은 비용 구조가 또 달라서, 그냥 EC2에 Socket.IO를 띄우는 게 단순하다.
- 응답 지연에 민감한 자주 호출되는 경로. 처음 실행 지연 한 번이 사용자 경험을 망칠 수 있다면 피하자.
- 긴 실행 작업 (>15분). 비디오 인코딩이나 대용량 데이터 가공은 Fargate나 AWS Batch가 낫다.

## 판단 기준

트래픽 패턴부터 본다. 평탄하면 서버리스 장점이 약해지고, 들쭉날쭉하면 강점이 살아난다.

상시 트래픽이 높고 팀이 인프라 제어권을 원한다면 쿠버네티스(K8s)가 맞는 방향이다. K8s는 컨테이너 오케스트레이션으로 서버리스보다 세밀한 스케일링과 배포 제어가 가능하지만, 운영 비용과 학습 곡선이 따른다. 서버리스 → EC2/Fargate → K8s 순으로 운영 복잡성이 올라간다고 보면 된다. 팀의 현재 운영 역량과 예상 트래픽 패턴이 스택 선택의 1순위 기준이다.

실행 시간 제약에 걸리는지 본다. 걸리면 Lambda 대신 Fargate를 본다.

팀이 로그와 디버깅 도구에 시간을 투자할 여력이 있는지 본다. 없으면 오히려 전통 서버가 들여다보기 쉽다.

서버리스는 만능이 아니다. 특정 패턴에서 압도적으로 효율적인 도구일 뿐이다. 도구 고를 때 흔한 실수는 "요즘 유행이니까"로 시작하는 거다. 트래픽 패턴, 실행 시간, 팀의 운영 역량. 세 축을 보고 고르면 된다.

## 참고 자료

- [AWS Lambda Developer Guide](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html): Lambda 실행 모델과 제약 공식 문서
- [Generating presigned URLs (AWS SDK v3)](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html): 서명된 URL 업로드 패턴 공식 가이드
- [Using Lambda with Amazon S3](https://docs.aws.amazon.com/lambda/latest/dg/with-s3.html): S3 이벤트로 Lambda 깨우는 설정
- [AWS Fargate](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html): Fargate 개요와 Lambda와의 비교
