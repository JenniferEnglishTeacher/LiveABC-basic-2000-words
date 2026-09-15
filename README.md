# LiveABC Basic 2000 Words

Interactive listening, reading, and vocabulary quizzes generated from the paired unit audio tracks.

- [Unit 1 — What Killed the Dinosaurs?](unit-01/unit-01-quiz.html)
- [Unit 2 — A Dinner Party](unit-02/unit-02-quiz.html)
- [Unit 3 — You're Invited to a Barbecue](unit-03/unit-03-quiz.html)

## Sentence pronunciation practice
Units 1-3 now include Part 4 with Azure pronunciation assessment and an 80% accuracy/completeness gate. See [Azure setup](AZURE-SETUP.md) to activate the secure scoring endpoint. Until connected, example playback is available and progression stays locked.

Validation: 30 source sentences and JavaScript syntax checked; five server tests passed; headless browser checks passed using synthetic microphone input and mocked Azure results. Live Azure microphone assessment has not yet been tested. The generic skill validator targets a different four-mode template; this repository uses scripts/validate-speaking.cjs for its existing unit-page structure.
