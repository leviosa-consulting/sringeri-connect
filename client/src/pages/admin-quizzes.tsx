import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Plus, Trash2, Save, ArrowLeft, Edit, GripVertical, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ADMIN_UIDS = (import.meta.env.VITE_QUIZ_ADMIN_UIDS || import.meta.env.VITE_ANALYTICS_ADMIN_UIDS || "").split(",").map((s: string) => s.trim()).filter(Boolean);

interface QuizOption {
  text: string;
  isCorrect: boolean;
}

interface QuizQuestion {
  id?: number;
  questionText: string;
  options: QuizOption[];
  correctCount: number;
  sortOrder: number;
}

interface Quiz {
  id: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  videoUrl: string | null;
  audioUrl: string | null;
  imageUrls: string[] | null;
  publishDate: string;
  isActive: boolean;
  questions?: QuizQuestion[];
}

export default function AdminQuizzes() {
  const { user, getToken } = useAuth();
  const isAdmin = user && ADMIN_UIDS.includes(user.uid);

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchQuizzes = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/quizzes", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setQuizzes(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { if (isAdmin) fetchQuizzes(); }, [isAdmin, fetchQuizzes]);

  const loadQuiz = async (id: number) => {
    const token = await getToken();
    const res = await fetch(`/api/admin/quizzes/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setEditing(data);
      setQuestions(data.questions || []);
    }
  };

  const createNew = () => {
    setEditing({
      id: 0,
      title: "",
      subtitle: null,
      description: null,
      videoUrl: null,
      audioUrl: null,
      imageUrls: null,
      publishDate: new Date().toISOString().split("T")[0],
      isActive: true,
    });
    setQuestions([]);
  };

  const saveQuiz = async () => {
    if (!editing || !editing.title.trim()) return;
    setSaving(true);
    setMessage("");
    try {
      const token = await getToken();
      const body = {
        title: editing.title,
        subtitle: editing.subtitle || null,
        description: editing.description || null,
        videoUrl: editing.videoUrl || null,
        audioUrl: editing.audioUrl || null,
        imageUrls: editing.imageUrls?.filter(Boolean) || null,
        publishDate: editing.publishDate,
        isActive: editing.isActive,
      };

      let quizId = editing.id;
      if (editing.id === 0) {
        const res = await fetch("/api/admin/quizzes", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
        const created = await res.json();
        quizId = created.id;
        setEditing({ ...editing, id: quizId });
      } else {
        await fetch(`/api/admin/quizzes/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
      }

      const questionsData = questions.map((q, i) => ({
        questionText: q.questionText,
        options: q.options,
        correctCount: q.options.filter(o => o.isCorrect).length || 1,
        sortOrder: i,
      }));
      await fetch(`/api/admin/quizzes/${quizId}/questions/bulk`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ questions: questionsData }),
      });

      setMessage("Saved successfully!");
      fetchQuizzes();
    } catch (err) {
      setMessage("Failed to save");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const deleteQuiz = async (id: number) => {
    if (!confirm("Delete this quiz and all its questions?")) return;
    const token = await getToken();
    await fetch(`/api/admin/quizzes/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    fetchQuizzes();
    if (editing?.id === id) { setEditing(null); setQuestions([]); }
  };

  const addQuestion = () => {
    setQuestions([...questions, {
      questionText: "",
      options: [{ text: "", isCorrect: false }, { text: "", isCorrect: false }],
      correctCount: 1,
      sortOrder: questions.length,
    }]);
  };

  const updateQuestionText = (idx: number, text: string) => {
    const updated = [...questions];
    updated[idx].questionText = text;
    setQuestions(updated);
  };

  const updateQuestionOptions = (idx: number, options: QuizOption[]) => {
    const updated = [...questions];
    updated[idx].options = options;
    updated[idx].correctCount = options.filter(o => o.isCorrect).length || 1;
    setQuestions(updated);
  };

  const removeQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const addOption = (qIdx: number) => {
    const updated = [...questions];
    updated[qIdx].options.push({ text: "", isCorrect: false });
    setQuestions(updated);
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    const updated = [...questions];
    updated[qIdx].options = updated[qIdx].options.filter((_, i) => i !== oIdx);
    updated[qIdx].correctCount = updated[qIdx].options.filter(o => o.isCorrect).length || 1;
    setQuestions(updated);
  };

  const toggleCorrect = (qIdx: number, oIdx: number) => {
    const updated = [...questions];
    updated[qIdx].options[oIdx].isCorrect = !updated[qIdx].options[oIdx].isCorrect;
    updated[qIdx].correctCount = updated[qIdx].options.filter(o => o.isCorrect).length || 1;
    setQuestions(updated);
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Access Denied</p>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="px-4 py-6 pb-24 lg:pb-8 space-y-5 max-w-3xl mx-auto" data-testid="admin-quiz-editor">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setEditing(null); setQuestions([]); }}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-serif font-bold">{editing.id === 0 ? "New Quiz" : "Edit Quiz"}</h1>
        </div>

        <div className="space-y-4 bg-card rounded-xl border border-border/50 p-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Title *</label>
            <Input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} data-testid="input-quiz-title" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Subtitle</label>
            <Input value={editing.subtitle || ""} onChange={e => setEditing({ ...editing, subtitle: e.target.value })} data-testid="input-quiz-subtitle" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Description (Markdown)</label>
            <textarea
              value={editing.description || ""}
              onChange={e => setEditing({ ...editing, description: e.target.value })}
              className="w-full min-h-[120px] rounded-lg border border-input bg-background px-3 py-2 text-sm"
              data-testid="input-quiz-description"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Video URL</label>
              <Input value={editing.videoUrl || ""} onChange={e => setEditing({ ...editing, videoUrl: e.target.value })} data-testid="input-quiz-video" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Audio URL</label>
              <Input value={editing.audioUrl || ""} onChange={e => setEditing({ ...editing, audioUrl: e.target.value })} data-testid="input-quiz-audio" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Image URLs (one per line)</label>
            <textarea
              value={(editing.imageUrls || []).join("\n")}
              onChange={e => setEditing({ ...editing, imageUrls: e.target.value.split("\n").filter(Boolean) })}
              className="w-full min-h-[60px] rounded-lg border border-input bg-background px-3 py-2 text-sm"
              data-testid="input-quiz-images"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Publish Date</label>
              <Input type="date" value={editing.publishDate} onChange={e => setEditing({ ...editing, publishDate: e.target.value })} data-testid="input-quiz-date" />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.isActive}
                  onChange={e => setEditing({ ...editing, isActive: e.target.checked })}
                  className="w-4 h-4 accent-primary"
                  data-testid="input-quiz-active"
                />
                <span className="text-sm font-medium">Active</span>
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif font-bold text-base">Questions ({questions.length})</h2>
            <Button size="sm" variant="outline" onClick={addQuestion} data-testid="button-add-question">
              <Plus className="w-4 h-4 mr-1" /> Add Question
            </Button>
          </div>

          {questions.map((q, qIdx) => (
            <div key={qIdx} className="bg-card rounded-xl border border-border/50 p-4 space-y-3" data-testid={`question-editor-${qIdx}`}>
              <div className="flex items-start gap-2">
                <GripVertical className="w-4 h-4 text-muted-foreground/50 mt-2 shrink-0" />
                <div className="flex-1">
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Question {qIdx + 1}</label>
                  <Input
                    value={q.questionText}
                    onChange={e => updateQuestionText(qIdx, e.target.value)}
                    placeholder="Question text"
                    data-testid={`input-question-text-${qIdx}`}
                  />
                </div>
                <Button variant="ghost" size="sm" className="text-destructive shrink-0" onClick={() => removeQuestion(qIdx)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2 pl-6">
                {q.options.map((opt, oIdx) => (
                  <div key={oIdx} className="flex items-center gap-2">
                    <button
                      onClick={() => toggleCorrect(qIdx, oIdx)}
                      className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                        opt.isCorrect ? "border-green-500 bg-green-500" : "border-muted-foreground/30"
                      )}
                      data-testid={`toggle-correct-${qIdx}-${oIdx}`}
                    >
                      {opt.isCorrect && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </button>
                    <Input
                      value={opt.text}
                      onChange={e => {
                        const updated = [...questions];
                        updated[qIdx].options[oIdx].text = e.target.value;
                        setQuestions(updated);
                      }}
                      placeholder={`Option ${oIdx + 1}`}
                      className="flex-1"
                      data-testid={`input-option-${qIdx}-${oIdx}`}
                    />
                    {q.options.length > 2 && (
                      <Button variant="ghost" size="sm" className="text-muted-foreground shrink-0" onClick={() => removeOption(qIdx, oIdx)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => addOption(qIdx)} data-testid={`button-add-option-${qIdx}`}>
                  <Plus className="w-3 h-3 mr-1" /> Add Option
                </Button>
                <p className="text-xs text-muted-foreground">
                  {q.options.filter(o => o.isCorrect).length} correct answer{q.options.filter(o => o.isCorrect).length !== 1 ? "s" : ""} marked
                </p>
              </div>
            </div>
          ))}
        </div>

        {message && (
          <p className={cn("text-sm font-medium text-center", message.includes("success") ? "text-green-600" : "text-red-600")}>{message}</p>
        )}

        <Button onClick={saveQuiz} disabled={saving || !editing.title.trim()} className="w-full bg-primary hover:bg-primary/90" data-testid="button-save-quiz">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
          Save Quiz
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 pb-24 lg:pb-8 space-y-5 max-w-3xl mx-auto" data-testid="admin-quizzes-page">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-serif font-bold">Quiz Management</h1>
        <Button size="sm" onClick={createNew} data-testid="button-create-quiz">
          <Plus className="w-4 h-4 mr-1" /> New Quiz
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>No quizzes yet. Create your first one!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {quizzes.map(q => (
            <div key={q.id} className="bg-card rounded-xl border border-border/50 p-4 flex items-center justify-between" data-testid={`quiz-item-${q.id}`}>
              <div className="space-y-0.5 flex-1 min-w-0">
                <h3 className="font-serif font-semibold text-sm truncate">{q.title}</h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{q.publishDate}</span>
                  <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", q.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600")}>
                    {q.isActive ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => loadQuiz(q.id)} data-testid={`button-edit-quiz-${q.id}`}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteQuiz(q.id)} data-testid={`button-delete-quiz-${q.id}`}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
