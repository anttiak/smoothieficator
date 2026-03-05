# Smoothieficator

A free and open lyrics and chords teleprompter web application. This tool allows musicians to load songs from chord/lyric sources, enter songs manually, and display them in a teleprompter-style view for live performances.

## Requirements

- Any modern web browser (Chrome, Firefox, Edge, Safari, etc.)
- No installation or backend required

## Features

- **Streamlined Interface**: Clean, compact design with a unified top bar for all controls
- **Multiple Song Import Methods**:
  - Copy-paste from any chord/lyric site or document
  - Manual song entry
- **Song Management**:
  - Automatically saves all imported songs locally
  - Easy browsing through your saved song library
  - Delete unwanted songs with a single click
- **Import/Export**:
  - Export all your saved songs as a JSON file for backup or transfer
  - Import a previously exported JSON file to restore your songs
- **Auto-scrolling Teleprompter**:
  - Adjustable speeds with per-song speed memory
  - Precise chord positioning and formatting
  - Section highlighting (verse, chorus, bridge, etc.)
- **Advanced Display Controls**:
  - Zoom functionality (50%-200%) with per-song zoom memory
  - Fullscreen mode for distraction-free viewing during performances
- **In-Song Editing**: Edit song content directly in the teleprompter view
- **Fullscreen Song Browser**: Navigate your entire song library in a dedicated fullscreen view
- **Responsive Design**: Works on multiple devices/screen sizes with touch-optimized mobile interface
- **Local Storage**: All songs are saved in your browser's local storage
- **Navigation**: Easily navigate between songs using buttons or keyboard shortcuts

## How to Use

1. Extract songs using one of the following methods:
   - **Copy-Paste**: Use a print-friendly view or plain text from any chord/lyric source for best results
   - **Manual Entry**: Enter song title, artist, and paste or type lyrics with chords
2. Adjust scroll speed and zoom level using the controls in the top bar (settings are remembered per song)
3. Use playback controls to start/stop scrolling or reset to the top
4. Navigate between saved songs using the navigation buttons or keyboard shortcuts
5. Use edit mode (E key) to modify songs directly in the teleprompter view
6. Access your full song library with the fullscreen song browser (S key)

## Keyboard Shortcuts

- **Space**: Start/Stop scrolling
- **↑/↓**: Manually scroll up/down
- **Home**: Reset scroll to top
- **F**: Toggle fullscreen mode
- **E**: Toggle in-song edit mode
- **Ctrl+Enter**: Save changes (when in edit mode)
- **Esc**: Exit fullscreen, close dropdowns, or cancel edits (when in edit mode)
- **←/→**: Navigate to previous/next saved song
- **+/-**: Increase/decrease scroll speed by one step
- **Q/W**: Decrease/increase zoom level
- **A**: Open add song dropdown
- **S**: Open fullscreen saved songs browser
- **I**: Open import/export dropdown
- **K**: Show keyboard shortcuts

## Installation

1. Clone this repository
2. Host on any simple web server (no backend required)
3. Open in a browser to begin using the teleprompter
4. Alternatively check the live demo at https://anttiak.github.io/smoothieficator/

## Privacy Note

This app uses your browser's local storage to save songs. Your song data stays on your device and is not shared with any servers.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## About

Created for and by musicians who need a simple, effective teleprompter for performances.
