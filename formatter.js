function safeArray(x) {
    return Array.isArray(x) ? x : [];
  }
  
  function timeAgo(date) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    const intervals = [
      { label: "y", seconds: 31536000 },
      { label: "mo", seconds: 2592000 },
      { label: "d", seconds: 86400 },
      { label: "h", seconds: 3600 },
      { label: "m", seconds: 60 },
      { label: "s", seconds: 1 },
    ];
    for (const interval of intervals) {
      const count = Math.floor(seconds / interval.seconds);
      if (count >= 1) return `${count}${interval.label} ago`;
    }
    return "just now";
  }
  
  function parseDate(timestamp) {
    if (!timestamp) return null;
    if (typeof timestamp === "number") {
      return new Date(timestamp * 1000);
    }
    return new Date(timestamp);
  }
  