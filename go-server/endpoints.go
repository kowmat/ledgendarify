package main

import (
    "encoding/json"
    "net/http"
    "strconv"
    "strings"
    "errors"
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
                    },
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
	InstructionType    string          `json:"instruction_type"`
	Animations         []AnimationJSON `json:"animations"`
}

type AnimationJSON struct {
	Name       string      `json:"name"`
	Direction  bool        `json:"direction"`
	Start      float64     `json:"start"`
	Length     float64     `json:"length"`
	Duration   int         `json:"duration"`
	TimeOffset int         `json:"time_offset"`
	Colors     []ColorJSON `json:"colors"`
}

type ColorJSON struct {
	R  uint8   `json:"r"`
	G  uint8   `json:"g"`
	B  uint8   `json:"b"`
}



var (
    _i_channel  chan<- Instruction
)


func (ij *InstructionJSON) decode() (Instruction, error) {
    var i Instruction

    type_string := strings.ToLower(ij.InstructionType)

    switch(type_string) {
        case "clear":
            i.instruction_type = CLEAR

        case "idles":
            i.instruction_type = IDLES

        case "anims":
            i.instruction_type = ANIMS
            i.animations = getAnimations(ij.Animations)

        default:
            return i, errors.New("Unknown instruction type \""+type_string+"\"")
    }


    return i, nil
}


func JSONEndpoint(w http.ResponseWriter, r *http.Request) {
    if ( r.Method != "POST" ) {
        return
    }

    var ij InstructionJSON
    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&ij)
    if ( err != nil ) {
        log.Println(err)
        return
    }

    decoded_instruction, err := ij.decode()
    if ( err != nil ) {
        log.Println(err)
        return
    }

    // send decoded instruction
    _i_channel<- decoded_instruction
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
