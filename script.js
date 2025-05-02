// User authentication - for demonstration purposes only
// In a real application, you would use secure server-side authentication
const USERS = [
    { username: "admin", password: "password123", displayName: "Administrator", role: "admin" },
    { username: "user", password: "user123", displayName: "Regular User", role: "user" }
  ];
  
  // Feed configuration
  const FEED_KEYS = [
    "carsparked",
    "entryslot1",
    "exitslot1",
    "entryslot2",
    "exitslot2",
    "entryslot3",
    "exitslot3"
  ];
  
  const USERNAME = "VirajKabbur"; // Your Adafruit IO username
  const API_KEY = "aio_LTwT60hnR78NUOnCSAfrRaPj0KHp";
  
  // DOM Elements
  const loginSection = document.getElementById("login-section");
  const parkingSection = document.getElementById("parking-section");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const loginButton = document.getElementById("login-button");
  const loginError = document.getElementById("login-error");
  const userDisplay = document.getElementById("user-display");
  const logoutButton = document.getElementById("logout-button");
  const feedsContainer = document.getElementById("feeds-container");
  const userViewContainer = document.getElementById("user-view-container");
  const adminViewContainer = document.getElementById("admin-view-container");
  const parkingVisualization = document.getElementById("parking-visualization");
  const totalSpotsElement = document.getElementById("total-spots");
  const availableSpotsElement = document.getElementById("available-spots");
  const occupiedSpotsElement = document.getElementById("occupied-spots");
  
  // Check if user is already logged in
  function checkLoggedIn() {
    const userData = localStorage.getItem("smartParkingUser");
    if (userData) {
      const user = JSON.parse(userData);
      showParkingData(user);
      return true;
    }
    return false;
  }
  
  // Event Listeners
  loginButton.addEventListener("click", attemptLogin);
  logoutButton.addEventListener("click", logout);
  
  // Handle 'Enter' key in password field
  passwordInput.addEventListener("keyup", function(event) {
    if (event.key === "Enter") {
      attemptLogin();
    }
  });
  
  // Login Function
  function attemptLogin() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!username || !password) {
      loginError.textContent = "Please enter both username and password";
      return;
    }
    
    const user = USERS.find(u => u.username === username && u.password === password);
    
    if (user) {
      // Store user info in localStorage (for demo purposes)
      localStorage.setItem("smartParkingUser", JSON.stringify({
        username: user.username,
        displayName: user.displayName,
        role: user.role
      }));
      
      showParkingData(user);
      
      // Clear login form
      usernameInput.value = "";
      passwordInput.value = "";
      loginError.textContent = "";
    } else {
      loginError.textContent = "Invalid username or password";
      passwordInput.value = "";
    }
  }
  
  // Logout Function
  function logout() {
    localStorage.removeItem("smartParkingUser");
    
    // Show login section, hide parking data
    loginSection.style.display = "block";
    parkingSection.style.display = "none";
    
    // Clear any existing data
    feedsContainer.innerHTML = "";
    parkingVisualization.innerHTML = "";
  }
  
  // Show parking data after successful login
  function showParkingData(user) {
    // Hide login, show parking section
    loginSection.style.display = "none";
    parkingSection.style.display = "block";
    
    // Show user info
    userDisplay.textContent = `Welcome, ${user.displayName}`;
    
    // Show correct view based on user role
    if (user.role === "admin") {
      adminViewContainer.style.display = "block";
      userViewContainer.style.display = "none";
      // Fetch detailed data for admin
      fetchDataForAdmin();
    } else {
      adminViewContainer.style.display = "none";
      userViewContainer.style.display = "block";
      // Fetch and visualize data for regular user
      fetchDataForUser();
    }
  }
  
  // Fetch data for admin view
  function fetchDataForAdmin() {
    // Clear any existing data
    feedsContainer.innerHTML = "";
    
    // Add status message
    const statusMsg = document.createElement("div");
    statusMsg.className = "status-message";
    statusMsg.textContent = "Loading detailed parking data...";
    feedsContainer.appendChild(statusMsg);
    
    // First, verify what feeds are available
    fetch(`https://io.adafruit.com/api/v2/${USERNAME}/feeds`, {
      headers: {
        "X-AIO-Key": API_KEY
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Error fetching feed list: ${response.status}`);
      }
      return response.json();
    })
    .then(feeds => {
      console.log("All available feeds:", feeds);
      
      // Get list of available feed keys
      const availableFeedKeys = feeds.map(feed => feed.key);
      
      // Check which of our feed keys exist
      const existingFeeds = FEED_KEYS.filter(key => availableFeedKeys.includes(key));
      
      if (existingFeeds.length === 0) {
        statusMsg.textContent = "No parking feeds found. Please check your Adafruit IO account.";
        return;
      }
      
      statusMsg.textContent = `Found ${existingFeeds.length} parking feeds. Loading data...`;
      
      // Create a feed info map for easy lookup
      const feedInfoMap = {};
      feeds.forEach(feed => {
        feedInfoMap[feed.key] = feed;
      });
      
      // Fetch data for each existing feed
      const promises = existingFeeds.map(key => fetchFeedData(key, feedInfoMap[key]));
      
      // When all feeds are fetched, update status
      Promise.all(promises)
        .then(() => {
          statusMsg.textContent = `Displaying data from ${existingFeeds.length} parking feeds`;
        })
        .catch(error => {
          console.error("Error fetching feeds:", error);
          statusMsg.textContent = `Error loading some feeds: ${error.message}`;
        });
    })
    .catch(error => {
      console.error("Error fetching feed list:", error);
      statusMsg.textContent = `Error: ${error.message}`;
    });
  }
  
  // Fetch data for user view (visual representation)
  function fetchDataForUser() {
    // Clear visualization
    parkingVisualization.innerHTML = "";
    
    // Add loading message
    const loadingMsg = document.createElement("div");
    loadingMsg.className = "loading-message";
    loadingMsg.textContent = "Loading parking availability...";
    parkingVisualization.appendChild(loadingMsg);
    
    // First, get the list of available feeds
    fetch(`https://io.adafruit.com/api/v2/${USERNAME}/feeds`, {
      headers: {
        "X-AIO-Key": API_KEY
      }
    })
    .then(response => response.json())
    .then(feeds => {
      // Create a map of feed keys to feed info
      const feedInfoMap = {};
      feeds.forEach(feed => {
        feedInfoMap[feed.key] = feed;
      });
      
      // Get data for entry/exit slot feeds and total cars parked
      const promises = [];
      
      // Fetch Cars Parked Data if available
      if (feedInfoMap["carsparked"]) {
        promises.push(
          fetch(`https://io.adafruit.com/api/v2/${USERNAME}/feeds/carsparked/data/last`, {
            headers: { "X-AIO-Key": API_KEY }
          })
          .then(response => response.json())
          .then(data => ({ type: "carsparked", data }))
          .catch(() => ({ type: "carsparked", data: { value: "0" } }))
        );
      } else {
        promises.push(Promise.resolve({ type: "carsparked", data: { value: "0" } }));
      }
      
      // Fetch Slot Data
      for (let i = 1; i <= 3; i++) {
        const entryKey = `entryslot${i}`;
        const exitKey = `exitslot${i}`;
        
        if (feedInfoMap[entryKey]) {
          promises.push(
            fetch(`https://io.adafruit.com/api/v2/${USERNAME}/feeds/${entryKey}/data/last`, {
              headers: { "X-AIO-Key": API_KEY }
            })
            .then(response => response.json())
            .then(data => ({ type: entryKey, data }))
            .catch(() => ({ type: entryKey, data: { value: "0" } }))
          );
        }
        
        if (feedInfoMap[exitKey]) {
          promises.push(
            fetch(`https://io.adafruit.com/api/v2/${USERNAME}/feeds/${exitKey}/data/last`, {
              headers: { "X-AIO-Key": API_KEY }
            })
            .then(response => response.json())
            .then(data => ({ type: exitKey, data }))
            .catch(() => ({ type: exitKey, data: { value: "0" } }))
          );
        }
      }
      
      // Process all data when ready
      Promise.all(promises)
        .then(results => {
          // Remove loading message
          parkingVisualization.innerHTML = "";
          
          // Process the data to determine slot status
          const feedData = {};
          results.forEach(result => {
            feedData[result.type] = result.data.value;
          });
          
          // Generate parking visualization
          createParkingVisualization(feedData);
        })
        .catch(error => {
          console.error("Error fetching parking data:", error);
          parkingVisualization.innerHTML = `<div class="error">Error loading parking data: ${error.message}</div>`;
        });
    })
    .catch(error => {
      console.error("Error fetching feeds:", error);
      parkingVisualization.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    });
  }
  
  // Create the visual parking lot representation
  function createParkingVisualization(feedData) {
    // Determine slot availability based on entry/exit data
    // This is a simplified approach - in a real system, you'd have more accurate status data
    
    // Parse total cars parked
    const totalCars = parseInt(feedData.carsparked || 0);
    
    // Use exact number of slots (3)
    const totalSlots = 3;
    const occupiedSlots = Math.min(totalCars, totalSlots);
    const availableSlots = totalSlots - occupiedSlots;
    
    // Update summary stats
    totalSpotsElement.textContent = totalSlots;
    availableSpotsElement.textContent = availableSlots;
    occupiedSpotsElement.textContent = occupiedSlots;
    
    // Create the parking lot visualization
    const parkingLot = document.createElement("div");
    parkingLot.className = "parking-lot";
    
    // Individual slot data (check entry/exit data if available)
    const slotStatus = [];
    
    // Try to determine individual slot status (if the data is available)
    for (let i = 1; i <= 3; i++) {
      const entryKey = `entryslot${i}`;
      const exitKey = `exitslot${i}`;
      
      // If we have both entry and exit data for this slot
      if (feedData[entryKey] !== undefined && feedData[exitKey] !== undefined) {
        // Simple logic: if entries > exits, slot is occupied
        const entries = parseInt(feedData[entryKey] || 0);
        const exits = parseInt(feedData[exitKey] || 0);
        slotStatus[i-1] = entries > exits;
      } else {
        // If we don't have specific slot data, distribute occupancy based on total cars
        slotStatus[i-1] = i <= occupiedSlots;
      }
    }
    
    // Create individual parking spots with specific status for each
    for (let i = 1; i <= totalSlots; i++) {
      const spot = document.createElement("div");
      spot.className = slotStatus[i-1] ? "parking-spot occupied" : "parking-spot available";
      
      const spotNumber = document.createElement("div");
      spotNumber.className = "spot-number";
      spotNumber.textContent = i;
      
      const spotStatus = document.createElement("div");
      spotStatus.className = "spot-status";
      spotStatus.textContent = slotStatus[i-1] ? "Occupied" : "Available";
      
      // Additional information about the slot
      const slotInfo = document.createElement("div");
      slotInfo.className = "slot-info";
      
      // Show different info based on status
      if (slotStatus[i-1]) {
        // For occupied spots
        slotInfo.textContent = `Slot ${i} occupied`;
      } else {
        // For available spots
        slotInfo.textContent = `Slot ${i} free`;
      }
      
      spot.appendChild(spotNumber);
      spot.appendChild(spotStatus);
      spot.appendChild(slotInfo);
      parkingLot.appendChild(spot);
    }
    
    // Add to the DOM
    parkingVisualization.appendChild(parkingLot);
    
    // Add last updated info
    const timestamp = document.createElement("div");
    timestamp.className = "timestamp";
    timestamp.textContent = `Last updated: ${new Date().toLocaleString()}`;
    parkingVisualization.appendChild(timestamp);
  }
  
  // Fetch data for an individual feed (admin view)
  async function fetchFeedData(feedKey, feedInfo) {
    try {
      const response = await fetch(`https://io.adafruit.com/api/v2/${USERNAME}/feeds/${feedKey}/data/last`, {
        headers: {
          "X-AIO-Key": API_KEY
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Data for feed ${feedKey}:`, data);
      
      const div = document.createElement("div");
      div.className = "feed";
      
      // Use feed name from feed info if available, otherwise use the key
      const displayName = feedInfo ? feedInfo.name : feedKey;
      
      const nameSpan = document.createElement("strong");
      nameSpan.textContent = `${displayName}: `;
      
      const valueSpan = document.createElement("span");
      if (data.value !== undefined) {
        valueSpan.textContent = data.value;
      } else {
        valueSpan.textContent = "No data available";
        valueSpan.className = "no-value";
      }
      
      const timestampSpan = document.createElement("span");
      timestampSpan.className = "timestamp";
      if (data.created_at) {
        timestampSpan.textContent = ` (Last updated: ${new Date(data.created_at).toLocaleString()})`;
      } else {
        timestampSpan.textContent = " (No timestamp available)";
      }
      
      div.appendChild(nameSpan);
      div.appendChild(valueSpan);
      div.appendChild(timestampSpan);
      
      feedsContainer.appendChild(div);
      return data;
      
    } catch (error) {
      console.error(`Error fetching ${feedKey}:`, error);
      
      const div = document.createElement("div");
      div.className = "feed";
      
      const nameSpan = document.createElement("strong");
      nameSpan.textContent = `${feedKey}: `;
      
      const errorSpan = document.createElement("span");
      errorSpan.className = "error";
      errorSpan.textContent = `Error: ${error.message}`;
      
      div.appendChild(nameSpan);
      div.appendChild(errorSpan);
      feedsContainer.appendChild(div);
      
      throw error; // Rethrow to be caught by Promise.all
    }
  }
  
  // Auto-refresh data every 30 seconds
  function setupAutoRefresh() {
    setInterval(() => {
      const userData = localStorage.getItem("smartParkingUser");
      if (userData) {
        const user = JSON.parse(userData);
        
        if (user.role === "admin" && adminViewContainer.style.display === "block") {
          fetchDataForAdmin();
        } else if (user.role === "user" && userViewContainer.style.display === "block") {
          fetchDataForUser();
        }
      }
    }, 30000); // 30 seconds
  }
  
  // Initialize app
  function initApp() {
    // Check if user is already logged in
    if (!checkLoggedIn()) {
      // If not logged in, show login section
      loginSection.style.display = "block";
      parkingSection.style.display = "none";
    }
    
    // Setup auto-refresh
    setupAutoRefresh();
  }
  
  // Start the application
  initApp();
