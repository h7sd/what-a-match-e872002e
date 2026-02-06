#!/bin/bash
# Sync all src files from v0-project to v0-next-shadcn build directory
cp -r /vercel/share/v0-project/src/* /vercel/share/v0-next-shadcn/src/
echo "Synced src files successfully"
