package com.po3.tvremote.tv

/** 삼성 타이젠 TV가 받는 리모컨 키 코드. */
enum class RemoteKey(val code: String) {
    POWER("KEY_POWER"),
    SOURCE("KEY_SOURCE"),
    MENU("KEY_MENU"),
    HOME("KEY_HOME"),
    BACK("KEY_RETURN"),
    UP("KEY_UP"),
    DOWN("KEY_DOWN"),
    LEFT("KEY_LEFT"),
    RIGHT("KEY_RIGHT"),
    ENTER("KEY_ENTER"),
    VOLUME_UP("KEY_VOLUP"),
    VOLUME_DOWN("KEY_VOLDOWN"),
    MUTE("KEY_MUTE"),
    CHANNEL_UP("KEY_CHUP"),
    CHANNEL_DOWN("KEY_CHDOWN"),
    PREVIOUS_CHANNEL("KEY_PRECH"),
    CHANNEL_LIST("KEY_CH_LIST"),
    PLAY("KEY_PLAY"),
    PAUSE("KEY_PAUSE"),
    REWIND("KEY_REWIND"),
    FAST_FORWARD("KEY_FF"),
    NUM_0("KEY_0"),
    NUM_1("KEY_1"),
    NUM_2("KEY_2"),
    NUM_3("KEY_3"),
    NUM_4("KEY_4"),
    NUM_5("KEY_5"),
    NUM_6("KEY_6"),
    NUM_7("KEY_7"),
    NUM_8("KEY_8"),
    NUM_9("KEY_9");

    companion object {
        fun digit(n: Int): RemoteKey = valueOf("NUM_$n")
    }
}
