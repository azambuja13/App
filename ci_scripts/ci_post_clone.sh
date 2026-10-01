#!/bin/sh
# Xcode Cloud post-clone: instala os Pods (Capacitor/CapacitorCordova) antes do build.
set -e
cd "$CI_PRIMARY_REPOSITORY_PATH"
pod install
