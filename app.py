from flask import Flask, render_template, send_from_directory
from flask_socketio import SocketIO, join_room, leave_room
from flask import request
from pywebpush import webpush, WebPushException
import json

CALL_ROOMS = {}
SID_ROOMS = {}
PUSH_SUBSCRIPTIONS = {}

VAPID_PRIVATE = "PCjUa789q1rNbHDzp1dYWBywFQxatw8KQeRKwWCOaVs"
VAPID_CLAIMS = {
    "sub": "mailto:cyansair05@gmail.com"
}

app = Flask(__name__)
socketio = SocketIO(app, async_mode="eventlet")

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/chat")
def chat_list():
    return render_template("chats.html")

@app.route("/chat/<chat_id>")
def chat(chat_id):
    return render_template("chat.html", chat_id=chat_id)

@app.route('/sw.js')
def serve_sw():
    return send_from_directory(app.static_folder, 'sw.js', mimetype='application/javascript') # type: ignore

@app.route('/manifest.json')
def serve_manifest():
    return send_from_directory(app.static_folder, 'manifest.json') # type: ignore

@app.route("/subscribe", methods=["POST"])
def subscribe():
    data = request.json
    chat_id = data.get("chat_id")
    user_id = data.get("user_id")
    sub_info = data.get("subscription")
    
    if chat_id and user_id and sub_info:
        if chat_id not in PUSH_SUBSCRIPTIONS:
            PUSH_SUBSCRIPTIONS[chat_id] = {}
        PUSH_SUBSCRIPTIONS[chat_id][user_id] = sub_info
        return {"status": "subscribed"}, 200
    return {"error": "invalid data"}, 400

@app.route("/send_push", methods=["POST"])
def send_push():
    data = request.json
    chat_id = data.get("chat_id")
    text = data.get("text")
    sender_id = data.get("sender_id")

    room_subs = PUSH_SUBSCRIPTIONS.get(chat_id, {})
    sent_count = 0

    for uid, sub in list(room_subs.items()):
        if uid != sender_id:
            try:
                webpush(
                    subscription_info=sub,
                    data=json.dumps({
                        "title": f"Чат: {chat_id}",
                        "body": text,
                        "sender": sender_id
                    }),
                    vapid_private_key=VAPID_PRIVATE,
                    vapid_claims=VAPID_CLAIMS
                )
                sent_count += 1
            except WebPushException as ex:
                print(f"Удаляем невалидную подписку: {ex}")
                room_subs.pop(uid, None)

    return {"status": "ok", "sent": sent_count}, 200

@socketio.on("update_message")
def handle_message(data):
    chat_id = data.get("chat_id")
    if chat_id:
        join_room(chat_id)

    socketio.emit(
        "receive_message",
        {"text": data.get("text"), "sender_id": data.get("sender_id")},
        to=chat_id,
    )


@socketio.on("join_call")
def handle_join_call(data):
    chat_id = data.get("chat_id")
    if not chat_id:
        return

    sid = request.sid  # type: ignore
    room = CALL_ROOMS.setdefault(chat_id, set())

    room.add(sid)
    SID_ROOMS.setdefault(sid, set()).add(chat_id)
    join_room(chat_id)

    other_peers = [s for s in room if s != sid]
    socketio.emit("peers", {"peers": other_peers}, to=sid)
    socketio.emit("call_joined", {"chat_id": chat_id, "count": len(room)}, to=sid)
    socketio.emit(
        "participant_joined",
        {"chat_id": chat_id, "count": len(room), "peer_id": sid},
        to=chat_id,
        include_self=False,
    )


@socketio.on("leave_call")
def handle_leave_call(data):
    chat_id = data.get("chat_id")
    if not chat_id:
        return

    sid = request.sid # type: ignore
    room = CALL_ROOMS.get(chat_id)
    if room and sid in room:
        room.discard(sid)
        if not room:
            CALL_ROOMS.pop(chat_id, None)
        SID_ROOMS.get(sid, set()).discard(chat_id)
        leave_room(chat_id)
        socketio.emit(
            "call_left",
            {"chat_id": chat_id, "count": len(room) if room else 0},
            to=chat_id,
        )
        socketio.emit(
            "peer_left",
            {"peer_id": sid, "chat_id": chat_id, "count": len(room) if room else 0},
            to=chat_id,
        )


@socketio.on("disconnect")
def handle_disconnect():
    sid = request.sid
    rooms = SID_ROOMS.pop(sid, set())
    for chat_id in list(rooms):
        room = CALL_ROOMS.get(chat_id)
        if room and sid in room:
            room.discard(sid)
            if not room:
                CALL_ROOMS.pop(chat_id, None)
            socketio.emit(
                "call_left",
                {"chat_id": chat_id, "count": len(room) if room else 0},
                to=chat_id,
            )
            socketio.emit(
                "peer_left",
                {"peer_id": sid, "chat_id": chat_id, "count": len(room) if room else 0},
                to=chat_id,
            )


@socketio.on("signal")
def handle_signal(data):
    target = data.get("to")
    payload = data.get("payload")
    if not target or not payload:
        return

    frm = request.sid
    socketio.emit("signal", {"from": frm, "payload": payload}, to=target)


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
