---
title: Working with a signal
description: A Markdown-first talk with ordinary document features and presentation notes.
format: slides
incremental: true
---

# Working with a signal

One short talk can preserve the evidence, the source, and the next question.

<!-- notes: Start with the notebook rather than the finished chart. -->

---

## Start with what is observed

![A dark board with a pale field sketch.](/studies/boards/seminar-blackboard.jpg)

The image is a site study, not a measurement. The data used later is synthetic.[^fixture]

[^fixture]: The chart fixture follows an analytic damped oscillator.

---

## Keep the model legible

| Quantity | Meaning      | Unit |
| -------- | ------------ | ---- |
| $t$      | elapsed time | s    |
| $x(t)$   | displacement | m    |

$$
x(t) = e^{-0.18t}\cos(2.4t)
$$

---

## Make the calculation inspectable

```typescript title="oscillator.ts" {4-5} focus={4-5}
const damping = 0.18;
const frequency = 2.4;
const displacement = (time: number) =>
  Math.exp(-damping * time) * Math.cos(frequency * time);
```

> [!NOTE]
> This is an analytic teaching fixture, not an observation from an instrument.

---

## Preserve relationships

```mermaid
flowchart LR
  Source[Source file] --> Figure[Inspectable figure]
  Figure --> Claim[Written claim]
  Claim --> Question[Next question]
```

The important part is the path back to the source.

<!-- notes: The alert and diagram are Markdown fences; explain their source role. -->
