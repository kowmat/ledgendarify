package main

import (
    "encoding/json"
    "net/http"
    "strconv"
    "log"
)

/*
The json should look something like this:
    {
        "instruction_type":"ANIMS",
        "animations": [
            {
                "name":"sweep",
                "direction": true,
                "start": 0.5,
                "length": 0.5,
                "duration": 1000,
                "time_offset": 0,
                "colors": [
                    {
                        "r": 100,
                        "g": 125,
                        "b": 255
                    }
                ]
            }
        ]
    }
*/
type InstructionJSON struct {
    InstructionType     string `json:"instruction_type"`
    Animations          []struct {
        Name                string  `json:"name"`
        Direction           bool    `json:"direction"`
        Start               float64 `json:"start"`
        Length              float64 `json:"length"`
        Duration            int     `json:"duration"`
        TimeOffset          int     `json:"time_offset"`
        Colors              []struct {
            R                   int `json:"r"`
            G                   int `json:"g"`
            B                   int `json:"b"`
        } `json:"colors"`
    } `json:"animations"`
}


var (
    _i_channel  chan<- Instruction
)


func JSONEndpoint(w http.ResponseWriter, r *http.Request) {
    if ( r.Method != "POST" ) {
        return;
    }

    var i InstructionJSON
    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&i)
    if ( err != nil ) {
        log.Println(err)
        return
    }
    log.Println(i)

    // send decoded instruction
    _i_channel<- Instruction{}
}


func setupServer(i chan<- Instruction, port uint16, path string) (error) {
    // assigning passed instruction channel to the internal one
    // so the JSONEndpoint can use it
    _i_channel = i

    http.HandleFunc(path, JSONEndpoint)

    log.Println("Staring golang server on", port)
    err := http.ListenAndServe(":"+strconv.Itoa(int(port)), nil)

    return err
}
