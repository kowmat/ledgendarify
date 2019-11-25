package main

import (
    "github.com/franeklubi/ledgend"
    "github.com/franeklubi/ledserv"
    "time"
    "log"
)


const (
    SHOW_DEBUG  bool = true
)


func sender(c chan<- []ledgend.Change, buffer *ledgend.Buffer, fps int64) {
    old_pixels := buffer.GetPixels()

    go func(){
        for {
            // applying the queue in the current point of time
            buffer.ApplyQueue()

            // xoring the pixels to get the changes
            xord, err := ledgend.XORPixels(old_pixels, buffer.GetPixels())
            if ( err != nil ) {
                log.Fatal(err)
            }

            // replacing the old_pixels with the pixels currently in the buffer
            old_pixels = buffer.GetPixels()

            // sending the changes
            c<- xord


            if ( SHOW_DEBUG ) {
                log.Printf("wysylanie %d zmian\n", len(xord))
                log.Println("Clients connected:", ledserv.ClientsConnected())
            }


            // sleeping to achieve the effect of fps
            time.Sleep(time.Second/time.Duration(fps))
        }
    }()
}
