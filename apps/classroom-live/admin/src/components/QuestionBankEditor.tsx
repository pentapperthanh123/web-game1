import React, { useState } from 'react';
import { BookOpen, Search, Plus, Trash2 } from 'lucide-react';
import { useAdminStore } from '../store/adminStore';
import type { GameModeType, QuestionItem } from '../../../shared/types/question.js';

export const QuestionBankEditor: React.FC = () => {
  const { questions, selectedCategory, setSelectedCategory, addQuestion, deleteQuestion } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [newTopic, setNewTopic] = useState('Văn học');
  const [newText, setNewText] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [newMode, setNewMode] = useState<GameModeType>('ANAGRAM');

  // Lọc câu hỏi theo bộ lọc môn & từ khóa
  const filtered = questions.filter((q) => {
    const matchCat = selectedCategory === 'ALL' || q.mode === selectedCategory;
    const matchSearch =
      q.questionText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.topic.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleCreate = () => {
    if (!newAnswer.trim() || !newText.trim()) return;
    const cleanAns = newAnswer.trim().toUpperCase();
    const item: QuestionItem = {
      id: `custom_${Date.now()}`,
      mode: newMode,
      topic: newTopic,
      questionText: newText,
      answer: cleanAns,
      scrambledLetters: cleanAns.replace(/\s+/g, '').split('').sort(() => Math.random() - 0.5),
    };
    addQuestion(item);
    setShowAddModal(false);
    setNewText('');
    setNewAnswer('');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h2 className="text-sm font-bold text-violet-400 flex items-center gap-1.5 uppercase tracking-wide">
          <BookOpen className="w-4 h-4" />
          <span>Ngân Hàng Câu Hỏi ({questions.length} câu)</span>
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1 bg-violet-600 hover:bg-violet-500 text-white font-bold px-2.5 py-1 rounded-lg text-xs transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Thêm Câu Mới</span>
        </button>
      </div>

      {/* Bộ lọc theo môn & tìm kiếm */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {(['ALL', 'ANAGRAM', 'QUIZ', 'ENGLISH'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded font-semibold transition cursor-pointer ${
                selectedCategory === cat ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {cat === 'ALL' ? 'Tất cả' : cat === 'ANAGRAM' ? 'Đảo Chữ' : cat === 'QUIZ' ? 'Trắc Nghiệm' : 'Tiếng Anh'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-gray-300">
          <Search className="w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo chủ đề, đáp án..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-xs w-40 text-white"
          />
        </div>
      </div>

      {/* Danh sách câu hỏi cuộn được */}
      <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
        {filtered.map((q, idx) => (
          <div
            key={q.id}
            className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800/80 hover:border-slate-700 text-xs"
          >
            <div className="flex flex-col gap-0.5 truncate max-w-[80%]">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-400">{idx + 1}.</span>
                <span className="font-bold text-amber-300">[{q.topic}]</span>
                <span className="text-gray-300 truncate">{q.questionText}</span>
              </div>
              <div className="text-[11px] text-emerald-400 font-semibold pl-4">
                Đáp án: <span className="underline">{q.answer}</span>
              </div>
            </div>

            <button
              onClick={() => deleteQuestion(q.id)}
              className="p-1 hover:bg-rose-900/50 rounded text-rose-400 transition cursor-pointer"
              title="Xóa câu hỏi"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Modal Thêm Câu Mới */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 max-w-md w-full flex flex-col gap-3 shadow-2xl">
            <h3 className="font-bold text-white text-sm">Thêm Câu Hỏi Mới</h3>

            <div className="flex flex-col gap-2 text-xs">
              <label className="text-gray-300">Thể loại:</label>
              <select
                value={newMode}
                onChange={(e) => setNewMode(e.target.value as GameModeType)}
                className="bg-slate-950 border border-slate-700 rounded p-1.5 text-white"
              >
                <option value="ANAGRAM">Đảo chữ (Vua Tiếng Việt)</option>
                <option value="QUIZ">Trắc nghiệm / Đố mẹo</option>
                <option value="ENGLISH">Từ vựng Tiếng Anh</option>
              </select>

              <label className="text-gray-300">Chủ đề:</label>
              <input
                type="text"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded p-1.5 text-white"
                placeholder="Ví dụ: Lịch sử, Thành ngữ, Vũ trụ..."
              />

              <label className="text-gray-300">Câu hỏi / Mô tả:</label>
              <textarea
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded p-1.5 text-white h-16 resize-none"
                placeholder="Nhập nội dung câu hỏi..."
              />

              <label className="text-gray-300">Đáp án chuẩn:</label>
              <input
                type="text"
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded p-1.5 text-white uppercase font-bold"
                placeholder="Ví dụ: SAO BĂNG hoặc A"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800 text-xs font-bold">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 rounded bg-slate-800 text-gray-300 hover:bg-slate-700"
              >
                Hủy
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-500"
              >
                Lưu Câu Hỏi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
