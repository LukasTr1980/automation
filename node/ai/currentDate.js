// getCurrentDate.js
const getCurrentDate = () => {
    const date = new Date();
    const weekdayOptions = { weekday: 'long' };
    const monthOptions = { month: 'long' };
    
    const weekday = date.toLocaleDateString('en-US', weekdayOptions);
    const month = date.toLocaleDateString('en-US', monthOptions);
  
    return { weekday, month };
  };
  
  module.exports = getCurrentDate;
  