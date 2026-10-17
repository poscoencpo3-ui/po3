# TV 리모컨 (삼성 스마트TV용 안드로이드 앱)

안드로이드 폰으로 집에 있는 **삼성 타이젠 스마트TV**(2016년 이후 모델, 예: KU75UT8000)를 조종하는 앱입니다.
폰과 TV가 같은 Wi-Fi에 있으면 TV의 리모컨 API(WebSocket)로 명령을 보냅니다.

## 기능

- 전원 끄기 / **꺼진 TV 켜기** (Wake-on-LAN)
- 방향키·확인, 뒤로, 홈, 메뉴, 입력 전환
- 음량 ±, 음소거, 채널 ±, 채널 목록, 숫자 키패드, 이전 채널
- 재생·일시정지·되감기·빨리감기
- TV에 설치된 앱 바로 실행 (유튜브, 넷플릭스 등, TV가 목록을 알려주는 경우)
- 같은 Wi-Fi에서 **TV 자동 찾기** (IP와 MAC 주소 자동 입력)
- 음량·방향키는 길게 누르면 계속 반복

## 1. 설치

1. 폰에서 아래 링크를 열어 APK를 받습니다.
   **https://github.com/poscoencpo3-ui/po3/releases/download/tv-remote-latest/tv-remote.apk**
2. 받은 파일을 누르면 "출처를 알 수 없는 앱" 경고가 나옵니다. **설정 → 이 출처 허용**을 켜고 돌아가서 **설치**를 누릅니다.
3. Play 프로텍트가 "알 수 없는 앱"이라고 경고하면 **세부정보 더보기 → 무시하고 설치**를 누릅니다.
   (플레이스토어를 거치지 않은 개인용 앱이라 뜨는 경고입니다.)

새 버전도 같은 링크에서 받아 그대로 덮어 설치하면 됩니다.

## 2. TV에서 한 번만 설정

| 할 일 | TV 메뉴 경로 |
|---|---|
| 폰으로 TV **켜기**를 쓰려면 | 설정 → 일반 → 네트워크 → 전문가 설정 → **모바일로 TV 켜기** 켜기 |
| TV IP 확인 (자동 찾기가 안 될 때) | 설정 → 일반 → 네트워크 → 네트워크 상태 → **IP 설정** |
| 연결을 거부했거나 차단됐을 때 | 설정 → 일반 → 외부 기기 관리 → **기기 연결 관리** → 기기 목록에서 'TV 리모컨'을 허용 |

공유기 설정에서 TV에 **고정 IP(DHCP 예약)**를 걸어두면 IP가 바뀌어 연결이 끊기는 일이 없습니다.

## 3. 처음 사용

1. TV를 켜고 앱을 실행하면 같은 Wi-Fi의 TV를 자동으로 찾습니다. 찾은 TV를 누릅니다.
   (안 보이면 아래 칸에 TV IP를 직접 입력하고 **저장하고 연결**)
2. TV 화면에 **연결 요청 팝업**이 뜨면 TV 리모컨으로 **허용**을 누릅니다.
3. 상단에 초록색 **연결됨**이 표시되면 끝입니다. 다음부터는 팝업 없이 바로 연결됩니다.

## 문제 해결

| 증상 | 해결 |
|---|---|
| TV 찾기에서 안 나옴 | TV가 켜져 있는지, 폰이 모바일 데이터가 아니라 **같은 Wi-Fi**에 연결돼 있는지 확인. 게스트 Wi-Fi는 기기끼리 통신이 막혀 있을 수 있음 |
| "연결 실패" | TV IP가 바뀌었을 수 있음 → 설정 화면에서 다시 찾기 |
| "연결 거부됨" | 위 표의 '기기 연결 관리'에서 허용으로 변경 후 **다시 연결** |
| 전원 버튼으로 안 켜짐 | '모바일로 TV 켜기'가 켜져 있는지 확인. TV를 **랜선**으로 연결했다면 MAC 주소가 자동으로 들어가지 않으므로 TV 설정 → 지원 → 이 TV 정보의 **유선 MAC**을 직접 입력 |
| 앱 바로가기가 안 보임 | 일부 TV 펌웨어는 설치된 앱 목록을 알려주지 않음 (리모컨 기능은 정상) |

## PC에서 먼저 테스트하기 (선택)

앱 없이 PC에서 TV가 명령을 받는지 확인할 수 있습니다.

```bash
pip install websocket-client
python tools/samsung_tv_test.py 192.168.0.20 info             # TV 이름, 모델, MAC 주소
python tools/samsung_tv_test.py 192.168.0.20 key KEY_VOLUP    # 음량 올리기 (처음엔 TV에서 허용)
python tools/samsung_tv_test.py 192.168.0.20 wake AA:BB:CC:DD:EE:FF  # 꺼진 TV 켜기
```

## 동작 원리

| 기능 | 방식 |
|---|---|
| TV 정보·자동 찾기 | `GET http://<TV>:8001/api/v2/` (이름, 모델, MAC) |
| 리모컨 키 | `wss://<TV>:8002/api/v2/channels/samsung.remote.control?name=<앱 이름 base64>&token=<토큰>` 에 `ms.remote.control` 메시지 |
| 페어링 | 첫 연결 때 TV가 허용 팝업을 띄우고, 허용하면 `ms.channel.connect` 이벤트로 토큰을 줌 → 폰에 저장 |
| TV 켜기 | MAC 주소로 만든 매직 패킷을 UDP 9·7번 포트로 브로드캐스트 (Wake-on-LAN) |

TV는 자체 서명 인증서를 쓰기 때문에 TV 연결에 한해서만 인증서 검증을 생략합니다 (`SamsungTvClient.kt`의 `localTvHttpClient`).

## 코드 구조

```
app/src/main/java/com/po3/tvremote/
├── tv/                    TV 통신 (안드로이드 의존성 없음, 단위 테스트 있음)
│   ├── SamsungTvClient.kt   WebSocket 연결·페어링·키 전송·앱 실행
│   ├── TvDiscovery.kt       TV 정보 조회, 같은 대역 TV 찾기
│   ├── WakeOnLan.kt         매직 패킷
│   ├── Subnet.kt            IP 계산
│   └── RemoteKey.kt         키 코드 목록
├── RemoteViewModel.kt     화면 상태와 동작
├── SettingsStore.kt       IP·MAC·토큰 저장
├── LocalNetwork.kt        폰의 Wi-Fi 주소
├── MainActivity.kt
└── ui/                    Jetpack Compose 화면 (리모컨, 연결 설정)
tools/samsung_tv_test.py   PC용 테스트 스크립트
```

## 직접 빌드하기

- **GitHub Actions**: `tv-remote/` 아래 파일을 수정해 푸시하면 `.github/workflows/tv-remote-android.yml`이 테스트와 빌드를 돌리고
  위 설치 링크(`tv-remote-latest` 릴리스)의 APK를 새 버전으로 바꿉니다.
- **Android Studio**: `tv-remote` 폴더를 열고 ▶ 실행. 명령줄에서는 `./gradlew assembleRelease`.

`keystore/shared-debug.keystore`는 빌드마다 서명이 같도록(덮어 설치가 되도록) 저장소에 함께 둔 **개인 설치용 키**입니다.
플레이스토어에 올리려면 비공개 키를 새로 만들어 교체해야 합니다.
