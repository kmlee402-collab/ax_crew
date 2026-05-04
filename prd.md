---
description: 
---

# PRD: AX Crew 활동 관리 플랫폼 (Prototype)

## 1. 프로젝트 개요
- **목적**: AX Crew의 과제 현황 추적, 기술 지식 자산화, 실시간 질의응답 활성화.
- **개발 환경**: Antigravity (Agent-based IDE)
- **UI 프레임워크**: Tailwind CSS (v3, 로컬 파일 활용)
- **데이터베이스**: PocketBase (Local 실행)
- **SDK**: PocketBase JavaScript SDK (로컬 파일 활용)

## 2. 공통 요구사항 (General Rules)
- 모든 데이터 저장은 PocketBase 컬렉션을 기반으로 동작할 것.
- 전체 레이아웃은 현대적인 Sidebar + Content 구조를 사용함.
- 사용자 정보는 PocketBase Auth 기능을 활용하거나 가입 정보를 세션처럼 관리함.
- **실시간 연동**: Q&A 등 실시간이 필요한 기능은 PocketBase의 Realtime 기능을 활용함.

## 3. 탭별 상세 요구사항

### Step 1: 회원가입 (Sign-up)
- **UI**: 단일 계정 정보 입력 폼.
- **항목**: 이름, 부서, 이메일, 비밀번호, AX Crew 여부 (Check박스).
- **로직**: 
  - 정보 입력 시 이메일 중복 체크를 수행하며, 중복 시 모달로 경고 메시지 출력.
  - 가입 완료 시 `users` 컬렉션에 정보를 저장하고 현재 세션 정보로 활용함.

### Step 2: 과제 관리 (Task Management)
- **UI**: 스타일링된 데이터 테이블.
- **기능**:
  - 과제 리스트 업로드 (JSON/CSV 파일 시뮬레이션).
  - 진행자와 완료 여부(Status)를 테이블 내에서 즉시 수정(Inline Edit) 가능.
  - 데이터 수정 시 PocketBase `tasks` 컬렉션에 즉시 반영.

### Step 3: AX 매뉴얼 (Naver Blog Style)
- **UI**: 네이버 블로그 글쓰기 화면 모사.
  - 상단: 제목 입력 필드, 첨부파일 아이콘.
  - 본문: 넓은 텍스트 영역(TextArea).
- **기능**:
  - 드래그 앤 드롭 또는 파일 선택을 통한 파일 첨부.
  - 작성 완료 시 게시물 목록으로 저장 및 조회 기능.

### Step 4: AX 타임라인 (Q&A Feed)
- **UI**: 트위터(X) 스타일의 타임라인.
  - 최상단: 유사 질문 검색창 (Search Bar).
  - 상단: 본인 프로필 이미지와 질문 입력창.
  - 하단: 질문 카드 피드 (기명 작성, 답글 스레드 포함).
- **기능**: 
  - 검색어 입력 시 기존 질문 데이터에서 키워드 필터링(Live Search).
  - 답글 달기 기능을 통해 질문-답변 관계 형성.
### Step 5: AX 프로젝트 보드 (Hybrid Management) - NEW
- **메인 뷰 (Jira Style)**:
  - 상태별(To-Do, In Progress, Done) 칸반 보드 레이아웃.
  - 카드 구성: 프로젝트명, 담당 크루(이름/부서), 진척도(%), 예상 완료일.
- **상세 뷰 (Notion Style)**:
  - 카드를 클릭하면 나타나는 우측 슬라이드 또는 중앙 모달 팝업.
  - 상단: 과제 메타데이터(상태, 담당자 등) 요약 영역.
  - 하단: Quill 에디터 기반의 [진행 로직] 및 [이슈/질문 사항] 기록 영역.

## 4. 데이터베이스 스키마 (Collection 설정)
- **users**: `email`, `name`, `department` (기본 auth collection 활용)
- **tasks**: `title`, `assignee`, `status` (진행전/진행중/완료), `order`
- **manuals**: `title`, `content`, `files` (PocketBase 내장 파일 필드), `author`
- **questions**: `text`, `author`, `parent_id` (답글용), `likes`

## 5. 주요 연동 로직
- 모든 탭은 시작 시 `pb.collection('이름').getFullList()`를 통해 데이터를 로드함.
- **실시간 기능**: Q&A 탭은 `pb.collection('questions').subscribe('*', function)`을 사용하여 실시간 피드 업데이트 구현.

## 6. 검증 가이드 (For Antigravity Agent)
- 각 Step이 끝날 때마다 브라우저 에이전트를 실행하여 PocketBase 데이터 입력/저장 테스트를 수행할 것.
- 탭 간 이동 및 페이지 새로고침 시에도 PocketBase에서 데이터를 정상적으로 불러오는지 점검할 것.
