#!/usr/bin/env python3
"""삼성 TV 연결 테스트 (PC용).

앱을 설치하기 전에 PC에서 TV가 명령을 받는지 확인할 때 쓴다.
PC와 TV가 같은 공유기에 연결돼 있어야 한다.

    pip install websocket-client

    python samsung_tv_test.py 192.168.0.20 info                  # TV 정보 (MAC 주소 포함)
    python samsung_tv_test.py 192.168.0.20 key KEY_VOLUP         # 키 보내기 (여러 개 가능)
    python samsung_tv_test.py 192.168.0.20 wake AA:BB:CC:DD:EE:FF  # 꺼진 TV 켜기

처음 key 명령을 보내면 TV 화면에 허용 팝업이 뜬다. 허용하면 받은 토큰을
tv_token.txt에 저장해서 다음부터는 팝업 없이 연결한다.
"""
import argparse
import base64
import json
import pathlib
import socket
import ssl
import sys
import time
import urllib.parse
import urllib.request

import websocket

APP_NAME = "TV 리모컨 (PC 테스트)"
TOKEN_FILE = pathlib.Path(__file__).with_name("tv_token.txt")


def show_info(ip):
    with urllib.request.urlopen(f"http://{ip}:8001/api/v2/", timeout=3) as response:
        device = json.load(response).get("device", {})
    for label, field in [
        ("이름", "name"),
        ("모델", "modelName"),
        ("Wi-Fi MAC", "wifiMac"),
        ("네트워크", "networkType"),
        ("전원 상태", "PowerState"),
        ("토큰 인증", "TokenAuthSupport"),
    ]:
        print(f"{label:>10}: {device.get(field, '-')}")
    return 0


def send_keys(ip, keys, port=8002):
    token = TOKEN_FILE.read_text().strip() if TOKEN_FILE.exists() else ""
    query = {"name": base64.b64encode(APP_NAME.encode()).decode()}
    if token:
        query["token"] = token
    url = f"wss://{ip}:{port}/api/v2/channels/samsung.remote.control?{urllib.parse.urlencode(query)}"

    # TV는 자체 서명 인증서를 쓰므로 인증서 검증을 끈다 (집 안 네트워크 전용).
    ws = websocket.create_connection(
        url, sslopt={"cert_reqs": ssl.CERT_NONE, "check_hostname": False}, timeout=40
    )
    try:
        if not token:
            print("TV 화면에 연결 요청 팝업이 뜨면 리모컨으로 '허용'을 눌러주세요...")
        while True:
            message = json.loads(ws.recv())
            event = message.get("event")
            if event == "ms.channel.connect":
                new_token = message.get("data", {}).get("token")
                if new_token and new_token != token:
                    TOKEN_FILE.write_text(new_token)
                    print(f"토큰 저장: {new_token} -> {TOKEN_FILE.name}")
                break
            if event == "ms.channel.unauthorized":
                print("TV가 연결을 거부했습니다. TV 설정 > 일반 > 외부 기기 관리 > 기기 연결 관리에서 허용으로 바꿔주세요.")
                return 1
            if event == "ms.channel.timeOut":
                print("TV에서 허용을 누르지 않아 시간이 초과됐습니다.")
                return 1

        for key in keys:
            ws.send(json.dumps({
                "method": "ms.remote.control",
                "params": {
                    "Cmd": "Click",
                    "DataOfCmd": key,
                    "Option": "false",
                    "TypeOfRemote": "SendRemoteKey",
                },
            }))
            print(f"보냄: {key}")
            time.sleep(0.4)
    finally:
        ws.close()
    return 0


def wake(mac, ip=None):
    hex_mac = "".join(c for c in mac if c.isalnum())
    if len(hex_mac) != 12:
        print("MAC 주소 형식이 올바르지 않습니다. 예: AA:BB:CC:DD:EE:FF")
        return 1
    packet = b"\xff" * 6 + bytes.fromhex(hex_mac) * 16
    targets = ["255.255.255.255"] + ([ip] if ip else [])
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        for target in targets:
            for port in (9, 7):
                sock.sendto(packet, (target, port))
    print("매직 패킷을 보냈습니다. TV가 켜지는 데 몇 초 걸릴 수 있습니다.")
    return 0


def main():
    parser = argparse.ArgumentParser(description="삼성 TV 연결 테스트")
    parser.add_argument("ip", help="TV IP 주소 (예: 192.168.0.20)")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("info", help="TV 정보 보기")
    key = sub.add_parser("key", help="리모컨 키 보내기")
    key.add_argument("keys", nargs="+", help="예: KEY_VOLUP KEY_MUTE KEY_HOME")
    wake_cmd = sub.add_parser("wake", help="Wake-on-LAN으로 TV 켜기")
    wake_cmd.add_argument("mac", help="TV의 MAC 주소")
    args = parser.parse_args()

    try:
        if args.command == "info":
            return show_info(args.ip)
        if args.command == "key":
            return send_keys(args.ip, args.keys)
        return wake(args.mac, args.ip)
    except (OSError, websocket.WebSocketException) as e:
        print(f"연결 실패: {e}\nTV가 켜져 있고 같은 Wi-Fi에 연결돼 있는지 확인해주세요.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
