# ONDA

소리를 섞으면 오브제가 합쳐지는 앰비언트 사운드 믹서. 슬라이더로 소리를 켜면 그 소리의 3D 오브제가 떠오르고, 두 개 이상 켜면 하나의 새 오브제로 합쳐진다.

- 테마 3개(자연, 도심, 노이즈), 테마마다 소리 4개와 오브제 15개
- 소리는 오디오 파일 없이 Web Audio로 실시간 합성
- 오브제 도감, 프리셋 저장, 슬립 타이머, 소리 결 조절, 다크 모드

## 구조

- `index.src.html`, `app/`: 원본. 고친 뒤 `python build.py`를 실행하면 `index.html`이 만들어진다.
- `index.html`: 빌드 결과. 스크립트가 모두 이 파일 안에 들어 있다.
- `app/style.css`, `thumbs/`, `fonts/`: 페이지가 함께 불러오는 파일.

로컬에서는 이 폴더에서 `python -m http.server`로 서버를 띄워 연다.

## 사용한 것과 라이선스

자연, 도심 테마의 소리는 Pixabay 녹음을 다듬은 루프(`sounds/`, 출처는 `licenses/sounds-Pixabay.md`)에 Web Audio 합성 소리를 겹친다. 노이즈 테마는 모두 합성이다. 오브제와 썸네일은 이 저장소의 코드로 만든 것이다. 그 밖에 외부에서 가져온 것은 아래 넷이고, 원문 라이선스는 `licenses/`에 있다.

| 이름 | 쓰는 곳 | 라이선스 |
|---|---|---|
| [three.js](https://threejs.org) r169 | 3D 오브제 (CDN) | MIT, `licenses/three.js-MIT.txt` |
| [Phosphor Icons](https://phosphoricons.com) | 아이콘 경로 | MIT, `licenses/Phosphor-Icons-MIT.txt` |
| [Pretendard](https://github.com/orioncactus/pretendard) | 본문 글꼴 (`fonts/`) | SIL OFL 1.1, `licenses/Pretendard-OFL.txt` |
| [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) | 로고 글꼴 (Google Fonts) | SIL OFL 1.1, `licenses/Cormorant-Garamond-OFL.txt` |

앱으로 배포할 때는 이 라이선스 문구를 앱 안의 오픈소스 라이선스 화면이나 함께 배포하는 파일에 넣는다.
