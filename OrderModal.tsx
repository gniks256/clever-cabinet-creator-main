import { useState } from "react";
import { X, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import type { CabinetConfig } from "./types";
import { generateBOM, calculatePrice } from "./types";

interface Props {
  config: CabinetConfig;
  price: number;
  onClose: () => void;
}

interface FormData {
  name: string;
  phone: string;
  email: string;
  city: string;
  comment: string;
}

type SubmitState = "idle" | "loading" | "success" | "error";

export function OrderModal({ config, price, onClose }: Props) {
  const [form, setForm] = useState<FormData>({
    name: "",
    phone: "",
    email: "",
    city: "",
    comment: "",
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  const validate = (): boolean => {
    const newErrors: Partial<FormData> = {};
    if (!form.name.trim()) newErrors.name = "Укажите имя";
    if (!form.phone.trim()) newErrors.phone = "Укажите телефон";
    else if (!/^[\d\s\+\-\(\)]{7,}$/.test(form.phone.trim()))
      newErrors.phone = "Неверный формат телефона";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = "Неверный формат email";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const bom = generateBOM(config);
  const bomSummary = bom
    .slice(0, 8)
    .map((item) => `${item.name} ${item.length}×${item.width} — ${item.quantity} шт.`)
    .join("\n");

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitState("loading");

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      city: form.city.trim(),
      comment: form.comment.trim(),
      price,
      dimensions: `${config.width}×${config.height}×${config.depth} мм`,
      texture: config.texture,
      columns: config.columns.length,
      bom_summary: bomSummary,
      config_json: JSON.stringify(config),
      created_at: new Date().toISOString(),
    };

    try {
      // TODO: Replace with your actual endpoint (Supabase / backend)
      // Example Supabase insert:
      // const { error } = await supabase.from('orders').insert(payload)
      // if (error) throw error

      // For now — simulate success after 1.2s
      // Remove this block and replace with real API call
      await new Promise((res) => setTimeout(res, 1200));

      // Uncomment when Supabase is set up:
      // const res = await fetch('/api/orders', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload),
      // });
      // if (!res.ok) throw new Error('Server error');

      console.log("Order payload:", payload); // Remove when backend is ready
      setSubmitState("success");
    } catch (err) {
      console.error("Order submit error:", err);
      setSubmitState("error");
    }
  };

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-[480px] bg-[#FDFCFB] rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden mx-0 sm:mx-4">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#E5E0D8]">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-[#8C847A] mb-0.5">
              Оформление заказа
            </div>
            <div className="font-semibold text-[18px] tracking-tight text-[#2A2624]">
              Шкаф {config.width}×{config.height}×{config.depth} мм
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 text-[#8C847A] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {submitState === "success" ? (
          <SuccessScreen onClose={onClose} />
        ) : (
          <div className="px-6 py-5 space-y-4 max-h-[80vh] overflow-y-auto">

            {/* Price summary */}
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200/80 rounded-2xl px-4 py-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-amber-700/70">
                  Стоимость материалов
                </div>
                <div className="font-semibold text-[22px] tracking-tight text-amber-900">
                  ${price.toFixed(2)}
                </div>
              </div>
              <div className="text-right text-[11px] text-amber-700/60 leading-relaxed">
                {config.columns.length} кол. · {bom.reduce((s, i) => s + i.quantity, 0)} дет.
                <br />
                Без сборки и доставки
              </div>
            </div>

            {/* Error banner */}
            {submitState === "error" && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                <AlertCircle size={16} className="flex-shrink-0" />
                Ошибка отправки. Попробуйте ещё раз или напишите нам напрямую.
              </div>
            )}

            {/* Form */}
            <div className="space-y-3">
              <Field
                label="Имя *"
                placeholder="Как вас зовут?"
                value={form.name}
                onChange={set("name")}
                error={errors.name}
              />
              <Field
                label="Телефон *"
                placeholder="+7 (___) ___-__-__"
                value={form.phone}
                onChange={set("phone")}
                error={errors.phone}
                type="tel"
              />
              <Field
                label="Email"
                placeholder="для отправки сметы"
                value={form.email}
                onChange={set("email")}
                error={errors.email}
                type="email"
              />
              <Field
                label="Город"
                placeholder="Для расчёта доставки"
                value={form.city}
                onChange={set("city")}
              />
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em] font-mono text-[#8C847A]">
                  Комментарий
                </label>
                <textarea
                  value={form.comment}
                  onChange={set("comment")}
                  placeholder="Особые пожелания, нюансы помещения..."
                  rows={3}
                  className="w-full bg-white border border-[#E5E0D8] rounded-xl px-4 py-3 text-sm text-[#2A2624] placeholder:text-[#8C847A] focus:border-amber-400/70 focus:outline-none transition-colors resize-none"
                />
              </div>
            </div>

            <div className="text-[11px] text-[#8C847A] leading-relaxed">
              Менеджер свяжется с вами в течение рабочего дня для уточнения деталей и согласования стоимости.
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitState === "loading"}
              className="w-full py-4 rounded-2xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, hsl(35 80% 55%), hsl(25 65% 38%))",
              }}
            >
              {submitState === "loading" ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Отправляем заявку...
                </>
              ) : (
                <>
                  Отправить заявку →
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  error,
  type = "text",
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase tracking-[0.15em] font-mono text-[#8C847A]">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full bg-white border rounded-xl px-4 py-3 text-sm text-[#2A2624] placeholder:text-[#C4BDB5] focus:outline-none transition-colors ${
          error
            ? "border-red-300 focus:border-red-400"
            : "border-[#E5E0D8] focus:border-amber-400/70"
        }`}
      />
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

function SuccessScreen({ onClose }: { onClose: () => void }) {
  return (
    <div className="px-6 py-10 flex flex-col items-center text-center gap-4">
      <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
        <CheckCircle size={32} className="text-green-500" />
      </div>
      <div>
        <div className="font-semibold text-[20px] tracking-tight text-[#2A2624] mb-2">
          Заявка отправлена!
        </div>
        <div className="text-sm text-[#8C847A] leading-relaxed max-w-[300px]">
          Менеджер свяжется с вами в течение рабочего дня. Конфигурация вашего шкафа сохранена.
        </div>
      </div>
      <button
        onClick={onClose}
        className="mt-2 px-8 py-3 rounded-2xl bg-[#F3F1EC] text-[#2A2624] text-sm font-semibold hover:bg-[#E8E4DC] transition-colors"
      >
        Продолжить настройку
      </button>
    </div>
  );
}
