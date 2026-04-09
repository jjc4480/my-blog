---
name: blog-orchestrator
description: "기술블로그 에이전트를 조율하는 오케스트레이터. 블로그 기능 구현, 페이지 추가, 컴포넌트 개발, 콘텐츠 파이프라인, 배포 등 블로그 개발/운영 작업 시 반드시 이 스킬을 사용할 것. '블로그', '포스트', '페이지', '컴포넌트', '배포', '빌드' 키워드가 포함된 요청에 트리거."
---

# Blog Orchestrator

기술블로그의 에이전트를 조율하여 개발/운영 작업을 수행하는 통합 스킬.

## 실행 모드: 서브 에이전트

## 에이전트 구성

| 에이전트 | subagent_type | 역할 | 스킬 | 출력 |
|---------|--------------|------|------|------|
| frontend-dev | general-purpose | UI 컴포넌트/페이지/레이아웃 | blog-frontend | `src/routes/`, `src/lib/components/` |
| content-engine | general-purpose | 마크다운 파이프라인, 피드, 검색, OG | blog-content | `src/lib/content/`, 피드 routes |
| infra-deploy | general-purpose | CF Pages, SEO, Analytics, 빌드 최적화 | blog-infra | 설정 파일, `src/app.html` |
| qa-verifier | general-purpose | 통합 검증, 경계면 교차 비교 | blog-qa | `_workspace/03_qa_report.md` |

모든 Agent 호출에 `model: "opus"` 파라미터를 명시한다.

## 워크플로우

### Phase 1: 준비

1. 사용자 요청 분석 — 어떤 작업인지 파악 (신규 기능, 버그 수정, 콘텐츠 작업 등)
2. 작업 디렉토리에 `_workspace/` 생성 (없으면)
3. 작업 범위에 따라 필요한 에이전트 선별 (모든 작업에 4개 전부 필요하지 않음)

### Phase 2: 병렬 개발 (팬아웃)

**실행 방식:** 병렬

독립적인 에이전트를 단일 메시지에서 동시 호출:

| 에이전트 | 프롬프트 구성 | model | run_in_background |
|---------|-------------|-------|-------------------|
| frontend-dev | `.claude/agents/frontend-dev.md` 읽고 역할 숙지 + `.claude/skills/blog-frontend/skill.md` 읽고 원칙 숙지 + 구체적 작업 지시 | opus | true |
| content-engine | `.claude/agents/content-engine.md` 읽고 역할 숙지 + `.claude/skills/blog-content/skill.md` 읽고 원칙 숙지 + 구체적 작업 지시 | opus | true |
| infra-deploy | `.claude/agents/infra-deploy.md` 읽고 역할 숙지 + `.claude/skills/blog-infra/skill.md` 읽고 원칙 숙지 + 구체적 작업 지시 | opus | true |

**프롬프트 템플릿:**

```
당신은 {agent-name} 에이전트입니다.

먼저 다음 파일을 읽고 역할과 원칙을 숙지하세요:
1. .claude/agents/{agent-name}.md (에이전트 정의)
2. .claude/skills/{skill-name}/skill.md (스킬 가이드)

그런 다음 아래 작업을 수행하세요:
{구체적 작업 내용}

작업 완료 후 변경한 파일 목록을 보고하세요.
```

### Phase 3: QA 검증 (팬인)

Phase 2의 모든 에이전트 완료 후 실행:

```
Agent(
  description: "Blog QA verification",
  model: "opus",
  prompt: "당신은 qa-verifier 에이전트입니다.
    먼저 다음 파일을 읽고 역할과 원칙을 숙지하세요:
    1. .claude/agents/qa-verifier.md
    2. .claude/skills/blog-qa/skill.md
    
    Phase 2에서 {agents}가 작업을 완료했습니다.
    검증 워크플로우에 따라 전체 프로젝트를 검증하고
    _workspace/03_qa_report.md에 보고서를 작성하세요."
)
```

### Phase 4: 수정 및 최종 확인

1. QA 보고서(`_workspace/03_qa_report.md`) 읽기
2. FAIL 항목이 있으면:
   - 해당 영역 담당 에이전트를 재호출하여 수정 지시
   - 수정 후 QA 재실행
3. 모든 항목 PASS 시:
   - 사용자에게 결과 요약 보고
   - 변경된 파일 목록 제시

## 작업 규모별 에이전트 선별

모든 작업에 4개 에이전트를 다 쓸 필요는 없다:

| 작업 유형 | 필요 에이전트 |
|----------|-------------|
| 새 페이지/컴포넌트 추가 | frontend-dev + qa-verifier |
| 포스트 관련 기능 (RSS, 검색 등) | content-engine + qa-verifier |
| 배포/SEO 설정 | infra-deploy + qa-verifier |
| 전체 기능 구현 (초기 셋업) | 4개 전부 |
| 디자인 수정 | frontend-dev + qa-verifier |
| 버그 수정 | 관련 에이전트 1개 + qa-verifier |

## 데이터 흐름

```
입력(사용자 요청)
    ↓
[오케스트레이터: 분석 + 에이전트 선별]
    ↓
┌─→ [frontend-dev] → src/routes/, src/lib/components/
├─→ [content-engine] → src/lib/content/, feed routes
└─→ [infra-deploy] → config files, src/app.html
    ↓ (완료 대기)
[qa-verifier] → _workspace/03_qa_report.md
    ↓
[오케스트레이터: 보고서 확인]
    ↓ (FAIL 있으면 재호출 루프)
[사용자에게 결과 보고]
```

## 에러 핸들링

| 상황 | 전략 |
|------|------|
| 에이전트 1개 실패 | 1회 재시도. 재실패 시 해당 영역 스킵하고 보고서에 명시 |
| 에이전트 과반 실패 | 사용자에게 알리고 진행 여부 확인 |
| QA 재호출 2회 이상 FAIL | 사용자에게 수동 개입 요청 |
| 경계면 불일치 | QA 보고서의 구체적 내용을 해당 에이전트에 전달하여 수정 |

## 테스트 시나리오

### 정상 흐름
1. 사용자가 "블로그 초기 셋업 해줘" 요청
2. Phase 1: 전체 구현으로 판단, 4개 에이전트 모두 선별
3. Phase 2: frontend-dev, content-engine, infra-deploy 병렬 실행
4. Phase 3: qa-verifier 검증 → 모든 항목 PASS
5. Phase 4: 사용자에게 완료 보고

### 에러 흐름
1. 사용자가 "새 컴포넌트 추가해줘" 요청
2. Phase 1: frontend-dev + qa-verifier 선별
3. Phase 2: frontend-dev 실행
4. Phase 3: qa-verifier 검증 → 경계면 FAIL (새 컴포넌트가 없는 props 참조)
5. Phase 4: frontend-dev 재호출 → 수정 → QA 재실행 → PASS
6. 사용자에게 완료 보고
