package main

import (
    "github.com/franeklubi/ledgend"
)


type InstructionType uint8

type Instruction struct {
    instruction_type    InstructionType
    animations          []ledgend.Animation
}


const (
    CLEAR   InstructionType = iota
    IDLES   InstructionType = iota
    ANIMS   InstructionType = iota
)


func (i *Instruction) interpret(b *ledgend.SyncBuffer) {

    switch(i.instruction_type) {
        case CLEAR:
            b.ClearQueue()

        case ANIMS:
            b.AddAnimation(i.animations...)
    }
}


func instructionWatcher(c <-chan Instruction, b *ledgend.SyncBuffer) {
    for {
        instruction := <-c
        instruction.interpret(b)
    }
}
