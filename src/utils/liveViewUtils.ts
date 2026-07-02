
// Generate days for the selected month
export const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = [];
    const dateIterator = new Date(year, month, 1);

    while (dateIterator.getMonth() === month) {
        days.push(new Date(dateIterator));
        dateIterator.setDate(dateIterator.getDate() + 1);
    }
    return days;
};

export const formatDayName = (date: Date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
};

export const formatMonthYear = (date: Date) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

export const isSameDay = (d1: Date, d2: Date) => {
    return d1.getDate() === d2.getDate() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getFullYear() === d2.getFullYear();
};

// Controls data
export const controls = [
    { id: 'refresh', icon: 'refresh', label: 'Refresh', type: 'material' },
    { id: 'quality', icon: 'quality-high', label: 'Quality', type: 'material' },
    { id: 'grid', icon: 'view-grid', label: 'Grid', type: 'material' },
    { id: 'camList', icon: 'text-box-outline', label: 'List', type: 'material' },
    { id: 'fullscreen', icon: 'fullscreen', label: 'Full', type: 'material' },
    { id: 'play', icon: 'play', label: 'Play', type: 'ionic' },
    { id: 'pause', icon: 'pause', label: 'Pause', type: 'ionic' },
    { id: 'ptz', icon: 'gamepad-circle', label: 'PTZ', type: 'material' },
    { id: 'aperture', icon: 'aperture', label: 'Iris', type: 'material' },
    { id: 'snapshot', icon: 'camera', label: 'Snap', type: 'material' },
    { id: 'record', icon: 'record-circle-outline', label: 'Record', type: 'material' },
];

export const alarmMessages = [
    { id: 1, title: 'Motion Detection', time: '11:24:10', type: 'motion' },
    { id: 2, title: 'Motion Detection', time: '01:23:34', type: 'motion' },
    { id: 3, title: 'Motion Detection', time: '11:24:10', type: 'motion' },
];
