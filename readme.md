# GMEdit-Constructor
A plugin for [GMEdit](https://github.com/YellowAfterlife/GMEdit) to compile and run your games!

This plugin serves the same purpose as [builder](https://github.com/YAL-GMEdit/builder), but after some
discussion with YAL (namely [here](https://github.com/YAL-GMEdit/builder/pull/5#issuecomment-1741857252)),
I decided to have a go at rewriting it with Igor.

Currently after a few days of work this nearly matches builder's capabilities, but hopefully has a much
easier-to-work-with codebase :)

## Features
There isn't really much here, since this plugin doesn't do a whole lot, but regardless:

 - [x] Run compile, run and clean jobs (technically can be in parallel!)
   - [x] Stop jobs by closing their tab
 - [x] Basic viewing of compile log output
 - [ ] Error highlighting (using Ace)

## Shortcuts

| Shortcut |        Key         |
|----------|--------------------|
| Compile  | <kbd>Ctrl+F5</kbd> |
|  Clean   | <kbd>Ctrl+F7</kbd> |
|   Run    |      <kbd>F5</kbd> |

Maybe later these can be customisable :)
