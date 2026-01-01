To continue last session, run `codex resume 019b74be-8ea5-7e52-8ba4-eea204b7e1ca`

***
Things to consider:
* add the Islamic calendar from World Islamic League
* add dates to show up according to Islamic calendar
* in settings a be able to set when a new day starts according to Islamic tradition
* add ESC-to-close menu'sas a keyboard shortcut
* Grocery/shopping and/or to buy (fu money) list in main menu
* put the timer/date somewhere
* Wire the capture keyboard shortcut
* consider adding a doing now toggle to capture
* kill deletes and delete is moved to another tables or just shows up in a logbook
* turn the inbox review into card that can be swiped
- [ ] can ibox review items have there text edited while in the process?
* Where does a now secondary action og when it is removed, if next and next is at 3 cap what then?
- [ ] Command now needs to add a second 
- [ ] onces theres two system needs to ask to replace prim or sec
- [ ] swap from next places into secondary now if there's a primary, if no primary it promotes to "do now"
- [ ] Swapping or removing always confirms stopping the timer before continuing
- [ ] Remove now from review list
- [ ] when primary now is complete promote the secondary to first
timezone selector needed for time tra stuff and tracker data
- [ ] set the today time to only count from midnight or a predefined time in the settings that marks the end of the day islamically


  Features Breakdown

  Can Implement (Core - matches your "bare bones" goal):
  | Feature                         | Feasibility | Notes                           |
  |---------------------------------|-------------|---------------------------------|
  | Large MM:SS display             | ✅ Easy     | Already have formatTimerDisplay |
  | Single Start button (idle)      | ✅ Easy     | Just UI change                  |
  | Single Pause button (running)   | ✅ Easy     | Backend exists                  |
  | Continue + End buttons (paused) | ✅ Easy     | resumeTimer + stopTimer exist   |
  | "Paused" status label           | ✅ Easy     | activeTimer.isPaused exists     |
  | Task title above timer          | ✅ Easy     | activeTimer.taskTitle exists    |

  Can Implement Later (Nice-to-have):
  | Feature                | Feasibility | Notes                                |
  |------------------------|-------------|--------------------------------------|
  | Focus Record history   | ✅ Moderate | Data exists in time_entry_segments   |
  | Timeline visualization | ⚠️ Moderate | Would need to build UI               |
  | Focus Note             | ⚠️ Moderate | Would need notes field on time_entry | Do this
  | Task picker dropdown   | ✅ Easy     | You use "Now" slots instead          |

  Skip (per your request):
  - Circular progress ring (decorative only)
  - Pomodoro mode
  - Overview stats panel

- [ ] Add a log option for the focus to track random activities
- [ ] add a logbook screen to view completed or cancelled tasks
- [ ] Focus Note 
- [x] Focus record to show start and end times limited to last 30 entries



run codex resume 019b7a0d-1ba6-7ca3-b78b-ac04ef9dcb8f
continue stop timer notes modal stop running time

- [ ] in sql rename time_entries table > notes to time_notes? But why???
- [ ] add notes field to focus window
- [ ] add an edge case for timers that go way to long with a means to adjust the time before confirming to save or delete like ticktick