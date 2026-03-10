import uuid
from flask import Flask, render_template
from flask_socketio import SocketIO, join_room, leave_room
from flask import request

CALL_ROOMS = {}
SID_ROOMS = {}

app = Flask(__name__)
socketio = SocketIO(app, async_mode="eventlet")


@app.route("/")
def index():
    chat_id = uuid.uuid4().hex
    return render_template("index.html", chat_id=chat_id)


@app.route("/chat/<chat_id>")
def chat(chat_id):
    return render_template("chat.html", chat_id=chat_id)


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


@socketio.on("file_announce")
def handle_file_announce(data):
    chat_id = data.get("chat_id")
    if not chat_id:
        return
    socketio.emit(
        "file_announced",
        {
            "id": data.get("id"),
            "name": data.get("name"),
            "size": data.get("size"),
            "mime": data.get("mime"),
            "sender_id": request.sid,
        },
        to=chat_id,
        include_self=False,
    )


@socketio.on("file_remove")
def handle_file_remove(data):
    chat_id = data.get("chat_id")
    if not chat_id:
        return
    socketio.emit(
        "file_removed",
        {"id": data.get("id"), "sender_id": request.sid},
        to=chat_id,
        include_self=False,
    )


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=1100, debug=False)
