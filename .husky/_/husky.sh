#!/usr/bin/env sh
if [ -z "$husky_skip_init" ]; then
  debug () {
    [ "$HUSKY_DEBUG" = "1" ] && echo "husky (debug) - $1"
  }
  readonly husky_skip_init=1
  export husky_skip_init
  0>
  debug "starting..."
  if [ -f .husky/.env ]; then
    debug "sourcing .husky/.env"
    . .husky/.env
  fi
  export readonly husky_skip_init
  sh -e "$0" "$@"
  exitCode=$?
  debug "done"
  exit $exitCode
fi
