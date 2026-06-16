---
title: "CollaDoc"
description: "Real-time collaborative document editor"
stack: ["React", "Socket.io", "Redis", "PostgreSQL"]
github: "https://github.com/yourname/colladoc"
demo: "https://colladoc.vercel.app"
order: 1
thumbnail: "../../assets/images/projects/test.jpg"
---

## Problem

Most note apps don't handle real-time multi-user editing well. I wanted to
understand how operational transforms and conflict resolution actually work
under the hood instead of just using a library blindly.

## Key decisions

I chose Redis pub/sub over a plain in-memory broadcast because the app
needed to support horizontal scaling across multiple Node instances —
in-memory state would break the moment there's more than one server process.

## Challenges

Handling out-of-order WebSocket messages during reconnects was the hardest
part. Solved it with a sequence-numbered event log per document.

## Result

Sub-200ms sync latency between clients in testing, supports 10+ concurrent
editors per document.
