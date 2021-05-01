package animserv

import (
    "github.com/franeklubi/ledgend"
    "github.com/franeklubi/ledserv"
    "time"
    "log"
)


const (
    SHOW_DEBUG  bool = true
)


func Sender(c chan<- []ledgend.Change, buffer *ledgend.SyncBuffer, fps int64) {
    old_pixels := buffer.GetPixels()

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
        if ( len(xord) > 0 ) {
            if ( SHOW_DEBUG ) {
				connected_clients := ledserv.ClientsConnected()
                if ( connected_clients == 0 ) {
                log.Println("Clients connected:", )
				}
                log.Printf("Sending %d changes\n", len(xord))
            }

            c<- xord
        }

        // sleeping to achieve the effect of fps
        time.Sleep(time.Second/time.Duration(fps))
    }
}
