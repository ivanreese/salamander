require "sweetbread"

task "build", "Compile everything", ()->
  rm "public"
  Compilers.copy "src/**/*.{css,html,wgsl}", "src", "public"
  Compilers.civet "src/**/*.civet", "src", "public"

task "watch", "Recompile on changes.", ()->
  watch "src", "build", reload

task "start", "Go!", ()->
  invoke "build"
  invoke "watch"
  serve "public"
