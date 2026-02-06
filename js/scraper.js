// Song scraper functionality
document.addEventListener("DOMContentLoaded", () => {
  const songContent = document.getElementById("song-content");
  const loadingIndicator = document.getElementById("loading-indicator");
  const errorLoad = document.getElementById("error-load");
  const teleprompter = document.getElementById("teleprompter");

  // Initialize local storage for saved songs
  const localSongs = JSON.parse(localStorage.getItem("savedSongs") || "{}");

  // Play count tracking
  let playCountTimer = null;
  let currentSongForPlayCount = null;
  let playCountTimestamp = null;

  // Make a function to update the localSongs cache from teleprompter.js edit mode
  window.updateLocalSongsCache = function (updatedSongs) {
    // Update the in-memory cache to match localStorage
    Object.assign(localSongs, updatedSongs);
    console.log("Local songs cache updated after editing");
  };

  // Listen for the manual extraction event
  document.addEventListener("songExtracted", (event) => {
    if (event.detail) {
      displaySong(event.detail);

      // Collapse controls to maximize teleprompter space
      const controls = document.getElementById("controls");
      if (controls && !controls.classList.contains("collapsed")) {
        document.getElementById("toggle-controls").click();
      }
    }
  });

  function showError(message) {
    errorLoad.textContent = message;
    errorLoad.classList.remove("hidden");
  }

  // Increment play count for a song
  function incrementPlayCount(song) {
    // Find the song in localStorage
    const savedSongsData = JSON.parse(
      localStorage.getItem("savedSongs") || "{}"
    );

    const entries = Object.entries(savedSongsData);
    const match = entries.find(
      ([id, savedSong]) =>
        savedSong.title === song.title && savedSong.artist === song.artist
    );

    if (match) {
      const [id, savedSong] = match;
      // Initialize playCount if it doesn't exist
      if (!savedSong.playCount) {
        savedSong.playCount = 0;
      }
      savedSong.playCount++;
      savedSongsData[id] = savedSong;
      localStorage.setItem("savedSongs", JSON.stringify(savedSongsData));

      // Update the in-memory cache
      localSongs[id] = savedSong;

      console.log(
        `Play count incremented for "${song.title}": ${savedSong.playCount}`
      );
    }
  }

  function displaySong(song) {
    // Stop any existing play count timer
    if (playCountTimer) {
      clearTimeout(playCountTimer);
      playCountTimer = null;
    }

    // Start new play count timer (20 seconds)
    currentSongForPlayCount = song;
    playCountTimestamp = new Date().toISOString();
    playCountTimer = setTimeout(() => {
      incrementPlayCount(song);
    }, 20000); // 20 seconds

    // Clear any existing content
    songContent.innerHTML = "";

    // Add song title and artist
    const header = document.createElement("div");
    header.classList.add("song-header");
    header.innerHTML = `<h2>${song.title}</h2><h3>by ${song.artist}</h3>`;
    songContent.appendChild(header);

    // Process the song content
    let content = song.content;

    // First, normalize any newlines to ensure consistent line breaks
    content = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // Replace [ch] tags with spans for chord styling, but preserve their original spacing
    content = content.replace(
      /\[ch\](.*?)\[\/ch\]/g,
      '<span class="chord">$1</span>'
    );

    // Identify and mark up sections like Verse, Chorus, etc.
    // Make sure any existing HTML section headers are removed first
    content = content.replace(/<div class="section-title">[^<]+<\/div>/g, "");

    // Then convert all section markers from text format to HTML
    const sectionRegex =
      /\[(Verse|Chorus|Bridge|Intro|Outro|Pre-Chorus|Interlude|Solo)(?:\s*\d+|\s+[^\]]*)*\]/g;
    content = content.replace(sectionRegex, (match) => {
      // Extract the base section type (Verse, Chorus, etc.)
      const sectionType = match.match(
        /\[(Verse|Chorus|Bridge|Intro|Outro|Pre-Chorus|Interlude|Solo)/
      )[1];
      return `<div class="section-title">${sectionType}</div>`;
    });

    // Split content into lines to process for chord/lyric pairs
    const lines = content.split("\n");
    let processedHtml = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if this line has chords (contains chord spans)
      const hasChords = line.includes('<span class="chord">');

      if (hasChords) {
        // Preserve whitespace in chord lines for positioning
        processedHtml += `<div class="chord-line" style="white-space: pre">${line}</div>`;
      } else if (line.trim() === "") {
        // Empty line becomes a spacer
        processedHtml += '<div class="spacer"></div>';
      } else {
        // Regular lyrics line
        processedHtml += `<div class="lyric-line">${line}</div>`;
      }
    }

    // Add the formatted content to the song content div
    const contentDiv = document.createElement("div");
    contentDiv.classList.add("song-body");
    contentDiv.innerHTML = processedHtml;
    songContent.appendChild(contentDiv);

    // Safely scroll to the top of the content if teleprompter exists
    if (teleprompter) {
      teleprompter.scrollTop = 0;
    }

    // Load saved scroll speed if available
    if (song.scrollSpeed) {
      const scrollSpeedInput = document.getElementById("scroll-speed");
      const speedValueDisplay = document.querySelector(".speed-value");

      if (scrollSpeedInput) {
        scrollSpeedInput.value = song.scrollSpeed;
        if (speedValueDisplay) {
          speedValueDisplay.textContent = song.scrollSpeed;
        }
      }
    }

    // Check if song already exists before saving
    // Don't save if this is triggered by keyboard navigation
    const isKeyboardNavigation = window.navigationInProgress === true;

    if (!isKeyboardNavigation && !songExistsInStorage(song)) {
      console.log("Saving song to storage (not a navigation event)");
      // Save to local storage with the current timestamp as key
      const timestamp = new Date().toISOString();
      // Initialize playCount and dateAdded for new songs
      if (!song.playCount) {
        song.playCount = 0;
      }
      if (!song.dateAdded) {
        song.dateAdded = timestamp;
      }
      localSongs[timestamp] = song;
      localStorage.setItem("savedSongs", JSON.stringify(localSongs));

      // Refresh the saved songs list if it's currently open
      updateSavedSongsDropdown();
    } else if (isKeyboardNavigation) {
      console.log("Skipping save due to navigation event");
    } else if (songExistsInStorage(song)) {
      console.log("Skipping save because song already exists");

      // Update the stored song's scroll speed if it changed
      const currentScrollSpeed = document.getElementById("scroll-speed")?.value;
      if (
        currentScrollSpeed &&
        song.scrollSpeed !== parseInt(currentScrollSpeed)
      ) {
        updateSongScrollSpeed(song, parseInt(currentScrollSpeed));
      }
    }

    // Store current song reference for scroll speed updates
    window.currentDisplayedSong = song;

    // Dispatch event that song has loaded
    window.dispatchEvent(new CustomEvent("songLoaded"));

    // Make sure mini controls are visible if they exist
    const miniControls = document.getElementById("mini-controls");
    if (miniControls) {
      miniControls.classList.add("visible");
    }
  }

  // Helper function to check if song already exists in storage
  function songExistsInStorage(newSong) {
    return Object.values(localSongs).some(
      (savedSong) =>
        savedSong.title === newSong.title && savedSong.artist === newSong.artist
    );
  }

  // Helper function to update a song's scroll speed in storage
  function updateSongScrollSpeed(song, newSpeed) {
    // Find the song in local storage and update its scroll speed
    const entries = Object.entries(localSongs);
    const match = entries.find(
      ([id, savedSong]) =>
        savedSong.title === song.title && savedSong.artist === song.artist
    );

    if (match) {
      const [id, savedSong] = match;
      savedSong.scrollSpeed = newSpeed;
      localSongs[id] = savedSong;
      localStorage.setItem("savedSongs", JSON.stringify(localSongs));

      // Update the current displayed song reference
      if (window.currentDisplayedSong) {
        window.currentDisplayedSong.scrollSpeed = newSpeed;
      }
    }
  }

  // Process song data from extraction tools
  window.processSongFromBookmarklet = function (songData) {
    if (!songData || !songData.content) {
      showError("Invalid or missing song data");
      return false;
    }

    // Display the song
    displaySong(songData);

    return true;
  };

  // Function to display and manage saved songs
  function showSavedSongs() {
    // Clear song content
    songContent.innerHTML = "";

    // Create saved songs UI
    const savedSongsDiv = document.createElement("div");
    savedSongsDiv.classList.add("saved-songs");

    // Check if controls are collapsed and add appropriate class
    const controls = document.getElementById("controls");
    const isControlsCollapsed =
      controls && controls.classList.contains("collapsed");
    if (isControlsCollapsed) {
      savedSongsDiv.classList.add("with-collapsed-controls");
    } else {
      savedSongsDiv.classList.add("with-expanded-controls");
    }

    // Add a back button to return to extraction UI
    const topControls = document.createElement("div");
    topControls.classList.add("saved-songs-controls");

    const backButton = document.createElement("button");
    backButton.textContent = "Back to Song Extraction";
    backButton.classList.add("compact-button");
    backButton.addEventListener("click", function () {
      // Hide the saved songs view
      songContent.innerHTML = "";
    });

    topControls.appendChild(backButton);
    savedSongsDiv.appendChild(topControls);

    const savedSongsHeader = document.createElement("h2");
    savedSongsHeader.textContent = "Your Saved Songs";
    savedSongsDiv.appendChild(savedSongsHeader);

    const songsList = document.createElement("ul");
    songsList.classList.add("songs-list");

    const savedSongsEntries = Object.entries(localSongs);

    if (savedSongsEntries.length === 0) {
      const noSongs = document.createElement("p");
      noSongs.textContent =
        "No songs saved yet. Load a song to save it automatically.";
      savedSongsDiv.appendChild(noSongs);
    } else {
      savedSongsEntries.forEach(([id, song]) => {
        const songItem = document.createElement("li");

        const songTitle = document.createElement("span");
        const limitedTitle = limitLength(song.title, 60);
        const limitedArtist = limitLength(song.artist, 60);
        songTitle.textContent = `${limitedTitle} - ${limitedArtist}`;
        songTitle.title = `${song.title} - ${song.artist}`; // Add tooltip for full names
        songItem.appendChild(songTitle);

        const loadButton = document.createElement("button");
        loadButton.textContent = "Load";
        loadButton.addEventListener("click", () => {
          displaySong(song);
        });
        songItem.appendChild(loadButton);

        // Add Rename button
        const renameButton = document.createElement("button");
        renameButton.textContent = "Rename";
        renameButton.addEventListener("click", () => {
          const newTitle = prompt("Enter new song title:", song.title);
          if (newTitle === null) return; // Cancelled
          const newArtist = prompt("Enter new artist name:", song.artist);
          if (newArtist === null) return; // Cancelled
          if (!newTitle.trim() || !newArtist.trim()) {
            alert("Title and artist cannot be empty.");
            return;
          }
          // Check for duplicate
          const duplicate = Object.values(localSongs).some(
            (s, idx) =>
              s.title === newTitle.trim() &&
              s.artist === newArtist.trim() &&
              Object.keys(localSongs)[idx] !== id
          );
          if (duplicate) {
            alert("A song with this title and artist already exists.");
            return;
          }
          song.title = newTitle.trim();
          song.artist = newArtist.trim();
          localSongs[id] = song;
          localStorage.setItem("savedSongs", JSON.stringify(localSongs));
          showSavedSongs();
        });
        songItem.appendChild(renameButton);

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.classList.add("delete-button");
        deleteButton.addEventListener("click", () => {
          if (confirm(`Delete "${song.title}" from saved songs?`)) {
            delete localSongs[id];
            localStorage.setItem("savedSongs", JSON.stringify(localSongs));
            showSavedSongs(); // Refresh the list
          }
        });
        songItem.appendChild(deleteButton);

        songsList.appendChild(songItem);
      });
      savedSongsDiv.appendChild(songsList);
    }

    songContent.appendChild(savedSongsDiv);
  }

  // Saved songs dropdown functionality
  const savedSongsBtn = document.getElementById("saved-songs-button");
  const songsDropdownContent = document.querySelector(
    "#songs-dropdown .dropdown-content"
  );
  const savedSongsContainer = document.getElementById("saved-songs-container");

  if (savedSongsBtn && songsDropdownContent) {
    savedSongsBtn.addEventListener("click", (e) => {
      e.stopPropagation();

      // Show fullscreen view instead of dropdown
      showFullscreenSavedSongs();

      // Close any open dropdowns first
      const extractDropdownContent = document.querySelector(
        "#extract-dropdown .dropdown-content"
      );
      if (
        extractDropdownContent &&
        !extractDropdownContent.classList.contains("hidden")
      ) {
        extractDropdownContent.classList.add("hidden");
      }

      // Close import/export dropdown
      const importExportDropdown = document.querySelector(
        "#import-export-dropdown .dropdown-content"
      );
      if (
        importExportDropdown &&
        !importExportDropdown.classList.contains("hidden")
      ) {
        importExportDropdown.classList.add("hidden");
      }

      // Close shortcuts popup if open
      const shortcutsPopup = document.getElementById("shortcuts-popup");
      if (shortcutsPopup && !shortcutsPopup.classList.contains("hidden")) {
        shortcutsPopup.classList.add("hidden");
      }
    });
  }

  // Initialize navigation buttons
  const prevSongBtn = document.getElementById("prev-song");
  const nextSongBtn = document.getElementById("next-song");

  if (prevSongBtn) {
    prevSongBtn.addEventListener("click", () => {
      if (typeof window.goToPreviousSong === "function") {
        window.goToPreviousSong();
      }
    });
  }

  if (nextSongBtn) {
    nextSongBtn.addEventListener("click", () => {
      if (typeof window.goToNextSong === "function") {
        window.goToNextSong();
      }
    });
  }

  // Helper function to limit string length
  function limitLength(str, maxLength) {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + "...";
  }

  // Update the saved songs dropdown content
  function updateSavedSongsDropdown() {
    if (!savedSongsContainer) return;

    const savedSongsData = JSON.parse(
      localStorage.getItem("savedSongs") || "{}"
    );
    savedSongsContainer.innerHTML = "";

    const header = document.createElement("div");
    header.classList.add("songs-header");
    header.innerHTML = `<h3>Saved Songs</h3>`;
    savedSongsContainer.appendChild(header);

    const savedSongsEntries = Object.entries(savedSongsData);

    if (savedSongsEntries.length === 0) {
      const noSongs = document.createElement("p");
      noSongs.textContent =
        "No songs saved yet. Extract a song to save it automatically.";
      noSongs.style.padding = "10px 5px";
      savedSongsContainer.appendChild(noSongs);
    } else {
      const songsList = document.createElement("ul");
      songsList.classList.add("songs-list");

      // Sort by newest first
      savedSongsEntries.sort((a, b) => b[0].localeCompare(a[0]));

      savedSongsEntries.forEach(([id, song]) => {
        const songItem = document.createElement("li");

        const songTitle = document.createElement("span");
        const limitedTitle = limitLength(song.title, 20);
        const limitedArtist = limitLength(song.artist, 20);
        songTitle.textContent = `${limitedTitle} - ${limitedArtist}`;
        songTitle.title = `${song.title} - ${song.artist}`; // Add tooltip for full names
        songItem.appendChild(songTitle);

        const loadButton = document.createElement("button");
        loadButton.textContent = "Load";
        loadButton.addEventListener("click", () => {
          displaySong(song);
          songsDropdownContent.classList.add("hidden");
        });
        songItem.appendChild(loadButton);

        // Add Rename button to dropdown
        const renameButton = document.createElement("button");
        renameButton.textContent = "Rename";
        renameButton.addEventListener("click", (e) => {
          e.stopPropagation();
          const newTitle = prompt("Enter new song title:", song.title);
          if (newTitle === null) return; // Cancelled
          const newArtist = prompt("Enter new artist name:", song.artist);
          if (newArtist === null) return; // Cancelled
          if (!newTitle.trim() || !newArtist.trim()) {
            alert("Title and artist cannot be empty.");
            return;
          }
          // Check for duplicate
          const duplicate = Object.values(localSongs).some(
            (s, idx) =>
              s.title === newTitle.trim() &&
              s.artist === newArtist.trim() &&
              Object.keys(localSongs)[idx] !== id
          );
          if (duplicate) {
            alert("A song with this title and artist already exists.");
            return;
          }
          song.title = newTitle.trim();
          song.artist = newArtist.trim();
          localSongs[id] = song;
          localStorage.setItem("savedSongs", JSON.stringify(localSongs));
          updateSavedSongsDropdown();
        });
        songItem.appendChild(renameButton);

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "X";
        deleteButton.classList.add("delete-button");
        deleteButton.title = "Delete Song";
        deleteButton.addEventListener("click", (e) => {
          e.stopPropagation();
          if (confirm(`Delete "${song.title}" from saved songs?`)) {
            delete localSongs[id];
            localStorage.setItem("savedSongs", JSON.stringify(localSongs));
            updateSavedSongsDropdown(); // Refresh the list
          }
        });
        songItem.appendChild(deleteButton);

        songsList.appendChild(songItem);
      });

      savedSongsContainer.appendChild(songsList);
    }
  }

  // Import/Export functionality
  const importExportBtn = document.getElementById("import-export-button");
  const importExportDropdownContent = document.querySelector(
    "#import-export-dropdown .dropdown-content"
  );
  const exportSongsBtn = document.getElementById("export-songs-button");
  const importSongsBtn = document.getElementById("import-songs-button");
  const importFileInput = document.getElementById("import-file-input");
  const importStatus = document.getElementById("import-status");

  if (importExportBtn && importExportDropdownContent) {
    importExportBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      importExportDropdownContent.classList.toggle("hidden");

      // Close other dropdowns
      const otherDropdowns = [
        document.querySelector("#songs-dropdown .dropdown-content"),
        document.querySelector("#extract-dropdown .dropdown-content"),
      ];

      otherDropdowns.forEach((dropdown) => {
        if (dropdown && !dropdown.classList.contains("hidden")) {
          dropdown.classList.add("hidden");
        }
      });

      // Close shortcuts popup if open
      const shortcutsPopup = document.getElementById("shortcuts-popup");
      if (shortcutsPopup && !shortcutsPopup.classList.contains("hidden")) {
        shortcutsPopup.classList.add("hidden");
      }
    });
  }

  // Add event listeners to close import/export when other dropdowns are opened
  const otherDropdownButtons = [
    document.getElementById("saved-songs-button"),
    document.querySelector("#extract-dropdown .dropdown-button"),
  ];

  otherDropdownButtons.forEach((button) => {
    if (button) {
      button.addEventListener("click", () => {
        if (
          importExportDropdownContent &&
          !importExportDropdownContent.classList.contains("hidden")
        ) {
          importExportDropdownContent.classList.add("hidden");
        }
      });
    }
  });

  // Export songs functionality
  if (exportSongsBtn) {
    exportSongsBtn.addEventListener("click", () => {
      const savedSongsData = localStorage.getItem("savedSongs");

      if (!savedSongsData || savedSongsData === "{}") {
        alert("No songs to export. Save some songs first!");
        return;
      }

      // Create JSON file blob
      const blob = new Blob([savedSongsData], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      // Create download link
      const a = document.createElement("a");
      a.href = url;
      a.download = `smoothieficator-songs-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();

      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      // Hide dropdown after export
      importExportDropdownContent.classList.add("hidden");
    });
  }

  // Import songs functionality
  if (importSongsBtn && importFileInput) {
    importSongsBtn.addEventListener("click", () => {
      importFileInput.click();
    });

    importFileInput.addEventListener("change", (e) => {
      if (!e.target.files.length) return;

      const file = e.target.files[0];
      if (file.type !== "application/json" && !file.name.endsWith(".json")) {
        showImportStatus("Error: Please select a valid JSON file.", "error");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedData = JSON.parse(event.target.result);

          // Validate imported data format
          if (typeof importedData !== "object") {
            showImportStatus("Error: Invalid data format.", "error");
            return;
          }

          // Get current songs
          const currentSongs = JSON.parse(
            localStorage.getItem("savedSongs") || "{}"
          );

          // Count stats for user feedback
          let totalImported = 0;
          let newSongs = 0;
          let updatedSongs = 0;

          // Process imported songs
          Object.entries(importedData).forEach(([id, song]) => {
            // Validate song data
            if (!song.title || !song.artist || !song.content) {
              return; // Skip invalid entries
            }

            // Initialize playCount if it doesn't exist
            if (typeof song.playCount === "undefined") {
              song.playCount = 0;
            }

            // Initialize dateAdded if it doesn't exist (for old exports)
            if (!song.dateAdded) {
              song.dateAdded = id; // Use the key as fallback
            }

            totalImported++;

            // Check if song already exists
            const existingEntry = Object.entries(currentSongs).find(
              ([_, savedSong]) =>
                savedSong.title === song.title &&
                savedSong.artist === song.artist
            );

            if (existingEntry) {
              updatedSongs++;
              // Update existing song, preserving playCount if higher and dateAdded
              const [existingId, existingSong] = existingEntry;
              const existingPlayCount = existingSong.playCount || 0;
              const importedPlayCount = song.playCount || 0;
              // Keep the higher play count
              song.playCount = Math.max(existingPlayCount, importedPlayCount);
              // Preserve the original dateAdded (keep the earlier one)
              if (existingSong.dateAdded) {
                song.dateAdded = existingSong.dateAdded;
              }
              currentSongs[existingId] = song;
            } else {
              newSongs++;
              // Add as new song - preserve original dateAdded or use key as fallback
              if (!song.dateAdded) {
                song.dateAdded = id; // Use the timestamp key as fallback for old exports
              }
              currentSongs[id] = song;
            }
          });

          // Save merged data back to localStorage
          localStorage.setItem("savedSongs", JSON.stringify(currentSongs));

          // Update the local songs reference to match localStorage
          Object.assign(localSongs, currentSongs);

          // Update UI and show status message
          updateSavedSongsDropdown();
          showImportStatus(
            `Import successful: ${totalImported} songs imported (${newSongs} new, ${updatedSongs} updated).`,
            "success"
          );
        } catch (error) {
          console.error("Import error:", error);
          showImportStatus(
            "Error: Could not parse the imported file.",
            "error"
          );
        }
      };

      reader.onerror = () => {
        showImportStatus("Error: Could not read the file.", "error");
      };

      reader.readAsText(file);

      // Reset the input so the same file can be selected again
      e.target.value = "";
    });
  }

  // Helper function to show import status
  function showImportStatus(message, type) {
    if (!importStatus) return;

    importStatus.textContent = message;
    importStatus.className =
      type === "error" ? "error-status" : "success-status";
    importStatus.classList.remove("hidden");

    // Auto-hide after 5 seconds
    setTimeout(() => {
      importStatus.classList.add("hidden");
    }, 5000);
  }

  // Fullscreen saved songs functionality
  let fullscreenSongsView = null;
  let selectedSongIndex = 0;
  let fullscreenSongsList = [];
  let allSongsData = []; // Store all songs for filtering
  let searchInput = null; // Store reference to search input
  let currentSortMode = "newest"; // Default sort mode
  const sortModes = [
    { id: "newest", label: "Newest First" },
    { id: "songAZ", label: "Song Name (A-Ö)" },
    { id: "songZA", label: "Song Name (Ö-A)" },
    { id: "artistAZ", label: "Artist (A-Ö)" },
    { id: "artistZA", label: "Artist (Ö-A)" },
    { id: "playCount", label: "Most Played" },
  ];

  // Function to sort songs based on current sort mode
  function sortSongs(songsArray, sortMode) {
    const sorted = [...songsArray]; // Create a copy to avoid mutating original

    switch (sortMode) {
      case "songAZ":
        sorted.sort((a, b) =>
          a[1].title.localeCompare(b[1].title, "fi", { sensitivity: "base" })
        );
        break;
      case "songZA":
        sorted.sort((a, b) =>
          b[1].title.localeCompare(a[1].title, "fi", { sensitivity: "base" })
        );
        break;
      case "artistAZ":
        sorted.sort((a, b) =>
          a[1].artist.localeCompare(b[1].artist, "fi", { sensitivity: "base" })
        );
        break;
      case "artistZA":
        sorted.sort((a, b) =>
          b[1].artist.localeCompare(a[1].artist, "fi", { sensitivity: "base" })
        );
        break;
      case "playCount":
        sorted.sort((a, b) => {
          const countA = a[1].playCount || 0;
          const countB = b[1].playCount || 0;
          return countB - countA; // Most played first
        });
        break;
      case "newest":
      default:
        sorted.sort((a, b) => {
          const dateA = a[1].dateAdded || a[0];
          const dateB = b[1].dateAdded || b[0];
          return dateB.localeCompare(dateA);
        });
        break;
    }

    return sorted;
  }

  // Apply current sort and re-render the list
  function applySortAndRender() {
    // Get current search term
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";
    
    // Start with all songs
    let songsToSort = allSongsData;
    
    // Apply search filter if needed
    if (searchTerm) {
      songsToSort = allSongsData.filter(([id, song]) => {
        const titleMatch = song.title.toLowerCase().includes(searchTerm);
        const artistMatch = song.artist.toLowerCase().includes(searchTerm);
        return titleMatch || artistMatch;
      });
    }
    
    // Apply sorting
    fullscreenSongsList = sortSongs(songsToSort, currentSortMode);
    selectedSongIndex = 0;
    
    // Re-render
    renderFilteredSongs();
  }

  // Cycle to next sort mode (for keyboard shortcut)
  function cycleNextSortMode() {
    const currentIndex = sortModes.findIndex(mode => mode.id === currentSortMode);
    const nextIndex = (currentIndex + 1) % sortModes.length;
    currentSortMode = sortModes[nextIndex].id;
    
    // Update the select element if it exists
    const sortSelect = document.getElementById("sort-mode-select");
    if (sortSelect) {
      sortSelect.value = currentSortMode;
    }
    
    applySortAndRender();
  }

  // Show fullscreen saved songs view
  function showFullscreenSavedSongs() {
    const savedSongsData = JSON.parse(
      localStorage.getItem("savedSongs") || "{}"
    );

    // Create fullscreen overlay
    fullscreenSongsView = document.createElement("div");
    fullscreenSongsView.classList.add("fullscreen-songs-view");

    // Header
    const header = document.createElement("div");
    header.classList.add("fullscreen-songs-header");

    const headerTop = document.createElement("div");
    headerTop.classList.add("fullscreen-songs-header-top");

    const title = document.createElement("h2");
    title.textContent = "Saved Songs";

    // Add search input
    const searchContainer = document.createElement("div");
    searchContainer.classList.add("fullscreen-songs-search");
    
    searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Search...";
    searchInput.classList.add("fullscreen-songs-search-input");
    searchInput.addEventListener("input", handleSearchInput);
    searchInput.addEventListener("keydown", handleSearchKeydown);
    
    searchContainer.appendChild(searchInput);

    // Add sort selector
    const sortContainer = document.createElement("div");
    sortContainer.classList.add("fullscreen-songs-sort");

    const sortLabel = document.createElement("span");
    sortLabel.classList.add("sort-label");
    sortLabel.textContent = "Sort:";

    const sortSelect = document.createElement("select");
    sortSelect.id = "sort-mode-select";
    sortSelect.classList.add("sort-select");

    sortModes.forEach((mode) => {
      const option = document.createElement("option");
      option.value = mode.id;
      option.textContent = mode.label;
      if (mode.id === currentSortMode) {
        option.selected = true;
      }
      sortSelect.appendChild(option);
    });

    sortSelect.addEventListener("change", (e) => {
      currentSortMode = e.target.value;
      applySortAndRender();
    });

    sortContainer.appendChild(sortLabel);
    sortContainer.appendChild(sortSelect);

    const closeButton = document.createElement("button");
    closeButton.classList.add("fullscreen-songs-close");
    closeButton.textContent = "Close";
    closeButton.addEventListener("click", closeFullscreenSavedSongs);

    headerTop.appendChild(title);
    headerTop.appendChild(searchContainer);
    headerTop.appendChild(sortContainer);
    headerTop.appendChild(closeButton);
    header.appendChild(headerTop);
    
    fullscreenSongsView.appendChild(header);

    // Content area
    const content = document.createElement("div");
    content.classList.add("fullscreen-songs-content");

    const savedSongsEntries = Object.entries(savedSongsData);

    if (savedSongsEntries.length === 0) {
      const emptyMessage = document.createElement("div");
      emptyMessage.classList.add("fullscreen-songs-empty");
      emptyMessage.textContent =
        "No songs saved yet. Add a song to get started!";
      content.appendChild(emptyMessage);
    } else {
      // Store all songs data
      allSongsData = savedSongsEntries;
      
      // Apply sorting
      fullscreenSongsList = sortSongs(savedSongsEntries, currentSortMode);
      selectedSongIndex = 0;

      const songsList = document.createElement("ul");
      songsList.classList.add("fullscreen-songs-list");
      songsList.id = "fullscreen-songs-list";

      fullscreenSongsList.forEach(([id, song], index) => {
        const songItem = document.createElement("li");
        songItem.dataset.songId = id;
        songItem.dataset.index = index;

        if (index === selectedSongIndex) {
          songItem.classList.add("selected");
        }

        // Song info
        const songInfo = document.createElement("div");
        songInfo.classList.add("fullscreen-songs-info");

        const songTitle = document.createElement("div");
        songTitle.classList.add("fullscreen-songs-title");
        songTitle.textContent = song.title;

        const songArtist = document.createElement("div");
        songArtist.classList.add("fullscreen-songs-artist");
        songArtist.textContent = `by ${song.artist}`;

        // Add play count if it exists and is greater than 0
        const playCount = song.playCount || 0;
        if (playCount > 0) {
          const playCountDiv = document.createElement("div");
          playCountDiv.classList.add("fullscreen-songs-playcount");
          playCountDiv.textContent = `Played ${playCount} time${
            playCount !== 1 ? "s" : ""
          }`;
          songInfo.appendChild(songTitle);
          songInfo.appendChild(songArtist);
          songInfo.appendChild(playCountDiv);
        } else {
          songInfo.appendChild(songTitle);
          songInfo.appendChild(songArtist);
        }

        // Actions
        const actions = document.createElement("div");
        actions.classList.add("fullscreen-songs-actions");

        const loadButton = document.createElement("button");
        loadButton.classList.add("fullscreen-songs-load");
        loadButton.textContent = "Load";
        loadButton.addEventListener("click", () => {
          displaySong(song);
          closeFullscreenSavedSongs();
        });

        const renameButton = document.createElement("button");
        renameButton.classList.add("fullscreen-songs-rename");
        renameButton.textContent = "Rename";
        renameButton.addEventListener("click", (e) => {
          e.stopPropagation();
          renameSongInFullscreen(id, song, songItem);
        });

        const deleteButton = document.createElement("button");
        deleteButton.classList.add("fullscreen-songs-delete");
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", (e) => {
          e.stopPropagation();
          deleteSongInFullscreen(id, song);
        });

        actions.appendChild(loadButton);
        actions.appendChild(renameButton);
        actions.appendChild(deleteButton);

        songItem.appendChild(songInfo);
        songItem.appendChild(actions);

        // Add click handler for song selection
        songItem.addEventListener("click", () => {
          selectSongInFullscreen(index);
        });

        songsList.appendChild(songItem);
      });

      content.appendChild(songsList);

      // Ensure first song is selected and visible
      setTimeout(() => {
        selectSongInFullscreen(0);
      }, 100);
    }

    fullscreenSongsView.appendChild(content);

    // Instructions footer
    const instructions = document.createElement("div");
    instructions.classList.add("fullscreen-songs-instructions");
    instructions.innerHTML = `
      <strong>Search:</strong> Type to filter • 
      <kbd>↑</kbd><kbd>↓</kbd> Navigate • <kbd>Enter</kbd> Load Song • 
      <kbd>O</kbd> Change Sort • <kbd>R</kbd> Rename • <kbd>Delete</kbd> Remove • <kbd>Esc</kbd> Clear/Close
    `;
    fullscreenSongsView.appendChild(instructions);

    // Add to DOM
    document.body.appendChild(fullscreenSongsView);

    // Add event listeners for keyboard navigation
    document.addEventListener("keydown", handleFullscreenSongsKeydown);

    // Focus the search input
    if (searchInput) {
      setTimeout(() => searchInput.focus(), 100);
    }
  }

  // Close fullscreen saved songs view
  function closeFullscreenSavedSongs() {
    if (fullscreenSongsView) {
      document.removeEventListener("keydown", handleFullscreenSongsKeydown);
      document.body.removeChild(fullscreenSongsView);
      fullscreenSongsView = null;
      fullscreenSongsList = [];
      allSongsData = [];
      searchInput = null;
      selectedSongIndex = 0;
    }
  }

  // Handle keyboard navigation in fullscreen view
  function handleFullscreenSongsKeydown(e) {
    if (!fullscreenSongsView) return;

    // Don't handle keys if there are no songs
    if (fullscreenSongsList.length === 0) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeFullscreenSavedSongs();
      }
      return;
    }

    // Don't intercept typing in search input, except for specific navigation keys
    const isSearchFocused = document.activeElement === searchInput;
    
    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        navigateFullscreenSongs(-1);
        break;

      case "ArrowDown":
        e.preventDefault();
        navigateFullscreenSongs(1);
        break;

      case "Enter":
        e.preventDefault();
        loadSelectedSong();
        break;

      case "Delete":
        // Only delete song if not focused on search input
        if (!isSearchFocused) {
          e.preventDefault();
          deleteSelectedSong();
        }
        break;

      case "Backspace":
        // Only delete song if not focused on search input
        if (!isSearchFocused) {
          e.preventDefault();
          deleteSelectedSong();
        }
        break;

      case "r":
      case "R":
        // Only rename if not focused on search input
        if (!isSearchFocused) {
          e.preventDefault();
          renameSelectedSong();
        }
        break;

      case "o":
      case "O":
        // Only cycle sort mode if not focused on search input
        if (!isSearchFocused) {
          e.preventDefault();
          cycleNextSortMode();
        }
        break;

      case "Escape":
        e.preventDefault();
        // If search has text, clear it; otherwise close the view
        if (isSearchFocused && searchInput.value) {
          searchInput.value = "";
          handleSearchInput();
        } else {
          closeFullscreenSavedSongs();
        }
        break;
    }
  }

  // Handle search input keydown for special keys
  function handleSearchKeydown(e) {
    // These keys are handled by handleFullscreenSongsKeydown
    // No need to do anything special here
  }

  // Handle search input changes
  function handleSearchInput() {
    if (!searchInput) return;
    
    // Use the new unified sort and render function
    applySortAndRender();
  }

  // Render the filtered songs list
  function renderFilteredSongs() {
    const content = document.querySelector(".fullscreen-songs-content");
    if (!content) return;
    
    // Get or create the songs list element
    let songsList = document.getElementById("fullscreen-songs-list");
    
    if (fullscreenSongsList.length === 0) {
      // Remove the list if it exists
      if (songsList) {
        songsList.remove();
      }
      
      // Remove any existing empty message
      const existingEmpty = content.querySelector(".fullscreen-songs-empty");
      if (existingEmpty) {
        existingEmpty.remove();
      }
      
      // Add empty message
      const emptyMessage = document.createElement("div");
      emptyMessage.classList.add("fullscreen-songs-empty");
      emptyMessage.textContent = "No songs match your search.";
      content.appendChild(emptyMessage);
      return;
    }
    
    // Remove any empty message
    const existingEmpty = content.querySelector(".fullscreen-songs-empty");
    if (existingEmpty) {
      existingEmpty.remove();
    }
    
    // Create the list if it doesn't exist
    if (!songsList) {
      songsList = document.createElement("ul");
      songsList.classList.add("fullscreen-songs-list");
      songsList.id = "fullscreen-songs-list";
      content.appendChild(songsList);
    }
    
    // Clear current list content
    songsList.innerHTML = "";
    
    // Render filtered songs
    fullscreenSongsList.forEach(([id, song], index) => {
      const songItem = document.createElement("li");
      songItem.dataset.songId = id;
      songItem.dataset.index = index;

      if (index === selectedSongIndex) {
        songItem.classList.add("selected");
      }

      // Song info
      const songInfo = document.createElement("div");
      songInfo.classList.add("fullscreen-songs-info");

      const songTitle = document.createElement("div");
      songTitle.classList.add("fullscreen-songs-title");
      songTitle.textContent = song.title;

      const songArtist = document.createElement("div");
      songArtist.classList.add("fullscreen-songs-artist");
      songArtist.textContent = `by ${song.artist}`;

      // Add play count if it exists and is greater than 0
      const playCount = song.playCount || 0;
      if (playCount > 0) {
        const playCountDiv = document.createElement("div");
        playCountDiv.classList.add("fullscreen-songs-playcount");
        playCountDiv.textContent = `Played ${playCount} time${
          playCount !== 1 ? "s" : ""
        }`;
        songInfo.appendChild(songTitle);
        songInfo.appendChild(songArtist);
        songInfo.appendChild(playCountDiv);
      } else {
        songInfo.appendChild(songTitle);
        songInfo.appendChild(songArtist);
      }

      // Actions
      const actions = document.createElement("div");
      actions.classList.add("fullscreen-songs-actions");

      const loadButton = document.createElement("button");
      loadButton.classList.add("fullscreen-songs-load");
      loadButton.textContent = "Load";
      loadButton.addEventListener("click", () => {
        displaySong(song);
        closeFullscreenSavedSongs();
      });

      const renameButton = document.createElement("button");
      renameButton.classList.add("fullscreen-songs-rename");
      renameButton.textContent = "Rename";
      renameButton.addEventListener("click", (e) => {
        e.stopPropagation();
        renameSongInFullscreen(id, song, songItem);
      });

      const deleteButton = document.createElement("button");
      deleteButton.classList.add("fullscreen-songs-delete");
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteSongInFullscreen(id, song);
      });

      actions.appendChild(loadButton);
      actions.appendChild(renameButton);
      actions.appendChild(deleteButton);

      songItem.appendChild(songInfo);
      songItem.appendChild(actions);

      // Add click handler for song selection
      songItem.addEventListener("click", () => {
        selectSongInFullscreen(index);
      });

      songsList.appendChild(songItem);
    });
    
    // Select first song if available
    if (fullscreenSongsList.length > 0) {
      setTimeout(() => {
        selectSongInFullscreen(0);
      }, 10);
    }
  }

  // Navigate songs in fullscreen view
  function navigateFullscreenSongs(direction) {
    const newIndex = selectedSongIndex + direction;

    if (newIndex >= 0 && newIndex < fullscreenSongsList.length) {
      selectSongInFullscreen(newIndex);
    }
  }

  // Select a song in fullscreen view
  function selectSongInFullscreen(index) {
    const songsList = document.getElementById("fullscreen-songs-list");
    if (!songsList) return;

    // Remove previous selection
    const previousSelected = songsList.querySelector(".selected");
    if (previousSelected) {
      previousSelected.classList.remove("selected");
    }

    // Add new selection
    selectedSongIndex = index;
    const newSelected = songsList.children[index];
    if (newSelected) {
      newSelected.classList.add("selected");
      // Scroll into view
      newSelected.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  // Load the currently selected song
  function loadSelectedSong() {
    if (
      selectedSongIndex >= 0 &&
      selectedSongIndex < fullscreenSongsList.length
    ) {
      const [id, song] = fullscreenSongsList[selectedSongIndex];
      displaySong(song);
      closeFullscreenSavedSongs();
    }
  }

  // Delete the currently selected song
  function deleteSelectedSong() {
    if (
      selectedSongIndex >= 0 &&
      selectedSongIndex < fullscreenSongsList.length
    ) {
      const [id, song] = fullscreenSongsList[selectedSongIndex];
      deleteSongInFullscreen(id, song);
    }
  }

  // Rename the currently selected song
  function renameSelectedSong() {
    if (
      selectedSongIndex >= 0 &&
      selectedSongIndex < fullscreenSongsList.length
    ) {
      const [id, song] = fullscreenSongsList[selectedSongIndex];
      const songItem = document.querySelector(`[data-song-id="${id}"]`);
      renameSongInFullscreen(id, song, songItem);
    }
  }

  // Rename song in fullscreen view
  function renameSongInFullscreen(id, song, songItem) {
    const newTitle = prompt("Enter new song title:", song.title);
    if (newTitle === null) return;
    const newArtist = prompt("Enter new artist name:", song.artist);
    if (newArtist === null) return;

    if (!newTitle.trim() || !newArtist.trim()) {
      alert("Title and artist cannot be empty.");
      return;
    }

    // Check for duplicate
    const duplicate = Object.values(localSongs).some(
      (s, idx) =>
        s.title === newTitle.trim() &&
        s.artist === newArtist.trim() &&
        Object.keys(localSongs)[idx] !== id
    );

    if (duplicate) {
      alert("A song with this title and artist already exists.");
      return;
    }

    // Update song data in localStorage
    const updatedSong = { ...song };
    updatedSong.title = newTitle.trim();
    updatedSong.artist = newArtist.trim();
    localSongs[id] = updatedSong;
    localStorage.setItem("savedSongs", JSON.stringify(localSongs));

    // Reload data from localStorage to get fresh object references
    const savedSongsData = JSON.parse(
      localStorage.getItem("savedSongs") || "{}"
    );
    const savedSongsEntries = Object.entries(savedSongsData);
    
    // Update allSongsData with fresh references
    allSongsData = savedSongsEntries;
    
    // Re-apply current sort and search to refresh the view
    applySortAndRender();
  }

  // Delete song in fullscreen view
  function deleteSongInFullscreen(id, song) {
    if (confirm(`Delete "${song.title}" from saved songs?`)) {
      delete localSongs[id];
      localStorage.setItem("savedSongs", JSON.stringify(localSongs));

      // Remove from UI and update arrays
      const songItem = document.querySelector(`[data-song-id="${id}"]`);
      if (songItem) {
        songItem.remove();
      }

      // Update both filtered and all songs lists
      fullscreenSongsList = fullscreenSongsList.filter(
        ([songId]) => songId !== id
      );
      allSongsData = allSongsData.filter(
        ([songId]) => songId !== id
      );

      // Adjust selected index if necessary
      if (selectedSongIndex >= fullscreenSongsList.length) {
        selectedSongIndex = Math.max(0, fullscreenSongsList.length - 1);
      }

      // If no songs left in filtered list
      if (fullscreenSongsList.length === 0) {
        // Check if there are songs in allSongsData (i.e., search is active)
        if (allSongsData.length === 0) {
          // No songs at all, close and reopen to show empty state
          closeFullscreenSavedSongs();
          showFullscreenSavedSongs();
        } else {
          // Songs exist but not in current search, show no matches message
          renderFilteredSongs();
        }
      } else {
        // Re-select current song
        selectSongInFullscreen(selectedSongIndex);
      }

      // Update the dropdown if it's open
      updateSavedSongsDropdown();
    }
  }

  // Make fullscreen function globally available
  window.showFullscreenSavedSongs = showFullscreenSavedSongs;
  window.closeFullscreenSavedSongs = closeFullscreenSavedSongs;
});
