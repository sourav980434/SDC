// Convert numbers to Indian Rupees in words (e.g., 1280 => One Thousand Two Hundred Eighty Rupees Only)
export function numberToWords(num) {
  if (num === null || num === undefined || isNaN(num)) return '';
  const n = Math.floor(Math.abs(num));
  if (n === 0) return 'Zero Rupees Only';

  const single = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const double = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertGroup(val) {
    let str = '';
    if (val >= 100) {
      str += single[Math.floor(val / 100)] + ' Hundred ';
      val %= 100;
    }
    if (val >= 10 && val < 20) {
      str += double[val - 10] + ' ';
    } else if (val >= 20 || val < 10) {
      if (val >= 20) {
        str += tens[Math.floor(val / 10)] + ' ';
        val %= 10;
      }
      if (val > 0) {
        str += single[val] + ' ';
      }
    }
    return str;
  }

  let result = '';
  const crore = Math.floor(n / 10000000);
  let remainder = n % 10000000;

  const lakh = Math.floor(remainder / 100000);
  remainder %= 100000;

  const thousand = Math.floor(remainder / 1000);
  remainder %= 1000;

  const hundred = remainder;

  if (crore > 0) result += convertGroup(crore) + 'Crore ';
  if (lakh > 0) result += convertGroup(lakh) + 'Lakh ';
  if (thousand > 0) result += convertGroup(thousand) + 'Thousand ';
  if (hundred > 0) result += convertGroup(hundred);

  return result.trim() + ' Rupees Only';
}

// Generate 4-digit Security PIN for report access
export function generateReportPin(bookingNo) {
  if (!bookingNo) return '8492';
  let hash = 0;
  for (let i = 0; i < bookingNo.length; i++) {
    hash = (hash << 5) - hash + bookingNo.charCodeAt(i);
    hash |= 0;
  }
  const pin = Math.abs(hash % 9000) + 1000;
  return pin.toString();
}
