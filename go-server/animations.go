package main

import (
    "github.com/franeklubi/ledgend/animations"
    "github.com/franeklubi/ledgend"
    "strings"
    "errors"
    "time"
    "log"
)


func SweepFromJSON(a AnimationJSON) ([]ledgend.Animation, error) {
    if ( len(a.Colors) < 2 ) {
        return nil, errors.New("Not enough colors in sweep call")
    }

    start := time.Now().Add(time.Millisecond*time.Duration(a.TimeOffset))
    duration := time.Millisecond*time.Duration(a.Duration)
    col_a := a.Colors[0]
    col_b := a.Colors[1]
    col_a_ledgend := ledgend.Color{col_a.R, col_a.G, col_a.B}
    col_b_ledgend := ledgend.Color{col_b.R, col_b.G, col_b.B}

    sweep := animations.Sweep(
        a.Direction,
        a.Start, a.Length,
        col_a_ledgend, col_b_ledgend,
        duration, start,
    )

    return []ledgend.Animation{sweep}, nil
}


func resolveAnimation(a AnimationJSON) ([]ledgend.Animation, error) {
    log.Println("resolving anim...")
    var (
        anims   []ledgend.Animation
        err     error
    )

    name_string := strings.ToLower(a.Name)

    switch(name_string) {
        case "sweep":
            anims, err = SweepFromJSON(a)
            if ( err != nil ) {
                log.Println(err)
            }


        default:
            return nil, errors.New("Unknown animation type \""+name_string+"\"")
    }

    return anims, nil
}


func getAnimations(anims_json []AnimationJSON) ([]ledgend.Animation) {
    var anims []ledgend.Animation

    for _, a := range anims_json {
        resolved, err := resolveAnimation(a)
        if ( err == nil ) {
            anims = append(anims, resolved...)
        }
    }

    return anims
}
