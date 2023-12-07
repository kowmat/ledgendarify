package main

import (
    "github.com/franeklubi/ledgend"
    "github.com/franeklubi/ledserv"
    . "github.com/kowmat/ledgendarify/animserv"
    "log"
)


const (
    BROADCAST_DELAY float64 = 1000
    JSON_ENDPOINT   string = "/json"
    LEDSERV_PORT    uint16 = 10107  // the standard ledgend port
    PORT            uint16 = 10108
    LEDS            uint16 = 150
    FPS             int64 = 60
)


var (
    instruction_channel chan Instruction = make(chan Instruction, 100)
)


func main() {
    // initializing ledserv's server
    send, err := ledserv.InitServer(LEDSERV_PORT)
    if ( err != nil ) {
        log.Fatal(err)
    }

    // broadcasting server's ip to a potential client
    ledserv.Broadcast(BROADCAST_DELAY)

    // creating the empty initial buffer
    buffer := ledgend.GenSyncBuffer(LEDS)

    go Sender(send, &buffer, FPS)

    go InstructionWatcher(instruction_channel, &buffer)

    SetupServer(instruction_channel, PORT, JSON_ENDPOINT)
}
