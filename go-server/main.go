package main

import (
    "github.com/franeklubi/ledgend"
    "github.com/franeklubi/ledserv"
    "log"
)


const (
    BROADCAST_DELAY float64 = 1000
    PORT            uint16 = 10107  // the standard ledgend port
    LEDS            uint16 = 150
    FPS             int64 = 60
)


func main() {
    // initializing ledserv's server
    send, err := ledserv.InitServer(PORT)
    if ( err != nil ) {
        log.Fatal(err)
    }

    // broadcasting server's ip to a potential client
    ledserv.Broadcast(BROADCAST_DELAY)

    // creating the empty initial buffer
    buffer := ledgend.GenBuffer(LEDS)

    sender(send, &buffer, FPS)
}
