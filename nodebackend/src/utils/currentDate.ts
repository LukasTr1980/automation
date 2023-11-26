const getCurrentDate = (): { weekday: string, month: string } => {
    const date = new Date();
    const weekdayOptions: Intl.DateTimeFormatOptions = { weekday: 'long' };
    const monthOptions: Intl.DateTimeFormatOptions = { month: 'long' };
    
    const weekday = date.toLocaleDateString('en-US', weekdayOptions);
    const month = date.toLocaleDateString('en-US', monthOptions);
  
    return { weekday, month };
  };
  
  export default getCurrentDate;
  