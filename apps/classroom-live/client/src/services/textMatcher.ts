/**
 * Chuẩn hóa xâu ký tự tiếng Việt:
 * 1. Đưa về dạng không dấu (NFD + regex loại bỏ diacritic)
 * 2. Thay thế đ/Đ -> d/D
 * 3. Loại bỏ ký tự đặc biệt, trim và thu gọn khoảng trắng
 * 4. So khớp linh hoạt (exact hoặc fuzzy nhẹ)
 */
export function normalizeVietnamese(input: string): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Kiểm tra xem câu trả lời của học sinh có khớp với đáp án chuẩn hay không.
 */
export function checkAnswerMatch(studentAnswer: string, correctAnswer: string): boolean {
  const normStudent = normalizeVietnamese(studentAnswer);
  const normCorrect = normalizeVietnamese(correctAnswer);

  if (!normStudent || !normCorrect) return false;

  // 1. So khớp chính xác sau khi chuẩn hóa
  if (normStudent === normCorrect) return true;

  // 2. So khớp nếu là đáp án trắc nghiệm A/B/C/D
  if (['a', 'b', 'c', 'd'].includes(normCorrect)) {
    // Học sinh gõ "A", "a.", "dap an A", "chon A"
    const firstChar = normStudent.split(' ')[0];
    if (firstChar === normCorrect) return true;
    const lastWord = normStudent.split(' ').pop();
    if (lastWord === normCorrect) return true;
  }

  // 3. Nếu là dạng chuỗi không khoảng trắng (ví dụ "saobang" vs "sao bang")
  const compactStudent = normStudent.replace(/\s+/g, '');
  const compactCorrect = normCorrect.replace(/\s+/g, '');
  if (compactStudent === compactCorrect) return true;

  return false;
}

