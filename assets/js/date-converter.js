class DateConverter {
    static toJalali(dateStr) {
        if (!dateStr) return '';
        const y = parseInt(dateStr.substring(0,4)), m = parseInt(dateStr.substring(4,6)), d = parseInt(dateStr.substring(6,8));
        const mn = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
        return `${d} ${mn[m-1]} ${y}`;
    }
}