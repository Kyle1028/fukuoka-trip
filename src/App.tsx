import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc,
  updateDoc, 
  doc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { 
  Calendar, CreditCard, MapPin, Users, Plus, Trash2, 
  Utensils, ShoppingBag, Train, Settings, Search, 
  ExternalLink, Wallet, X, NotebookPen, StickyNote,   
  EyeOff, RotateCcw, Pencil, AlertCircle, Plane,
  Sparkles, Cherry, RefreshCw, Loader2, Map,
  PlaneTakeoff, PlaneLanding, GripVertical
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Firebase 設定 ---
const firebaseConfig = {
  apiKey: "AIzaSyAPOHtOKKtONX5nJ1S9i-ynV2l94AplMvo",
  authDomain: "japan-visit-77b2b.firebaseapp.com",
  projectId: "japan-visit-77b2b",
  storageBucket: "japan-visit-77b2b.firebasestorage.app",
  messagingSenderId: "853827374476",
  appId: "1:853827374476:web:6e214bee865e056d205aa9",
  measurementId: "G-76QFKFC3MV"
};

const appId = "fukuoka-trip-2026"; 

// --- 初始化 Firebase ---
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
console.log('Analytics initialized:', analytics);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 類型定義 ---
interface ItineraryItem {
  id: string;
  day: string;
  time: string;
  title: string;
  type: string;
  typeLabel: string;
  notes?: string;
  createdBy: string;
  createdAt?: Timestamp;
}

interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
  payer: string;
  currency: 'JPY' | 'TWD';
  createdAt?: Timestamp;
}

interface MemoItem {
  id: string;
  content: string;
  category: string;
  createdBy: string;
  createdAt?: Timestamp;
}

interface GuideItem {
  id: string;
  title: string;
  tag: string;
  color: string;
  desc: string;
  keywords: string;
  url: string;
}


// --- 攻略資料 ---
const GUIDE_DATA: GuideItem[] = [
  { 
    id: 'sale', 
    title: "冬季清倉折扣 (Winter Sale)", 
    tag: "購物衝刺", 
    color: "bg-pink-500/20 text-pink-300 border-pink-500/30", 
    desc: "1月中旬是日本折扣季的「再降價」時期 (More Sale)。博多運河城、AMU Plaza、Parco 的冬裝折扣這時最深，適合撿便宜！", 
    keywords: "購物 逛街 百貨 折扣 衣服",
    url: "https://canalcity.co.jp/"
  },
  { 
    id: 'acros', 
    title: "ACROS 福岡燈飾", 
    tag: "直到2/1", 
    color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30", 
    desc: "天神中央公園旁的 ACROS 階梯花園會有美麗燈飾。今年主題是與繪本「醜比頭」合作，非常特別。晚上18:00點燈。", 
    keywords: "燈飾 夜景 拍照 天神",
    url: "https://www.acros.or.jp/"
  },
  { 
    id: 'oyster', 
    title: "系島・牡蠣小屋", 
    tag: "季節限定美食", 
    color: "bg-orange-500/20 text-orange-300 border-orange-500/30", 
    desc: "1月是牡蠣最肥美的季節！推薦搭電車轉巴士或租車去「系島」的岐志漁港，體驗穿著外套現烤牡蠣的樂趣。", 
    keywords: "美食 午餐 海鮮 牡蠣 自駕",
    url: "https://www.google.com/maps/search/糸島+牡蠣小屋"
  },
  { 
    id: 'strawberry', 
    title: "採草莓 (甜王)", 
    tag: "當季水果", 
    color: "bg-red-500/20 text-red-300 border-red-500/30", 
    desc: "福岡是「甜王草莓 (Amaou)」的產地。這段時間草莓園開放採摘吃到飽，非常受歡迎，建議提前預約。", 
    keywords: "水果 美食 體驗 甜點",
    url: "https://www.jalan.net/kankou/spt_guide000000188915/"
  },
  { 
    id: 'dazaifu', 
    title: "太宰府天滿宮", 
    tag: "早開梅花", 
    color: "bg-rose-500/20 text-rose-300 border-rose-500/30", 
    desc: "雖然新年參拜高峰已過，但1月中旬有機會看到著名的神木「飛梅」開始綻放（通常是全境最早開的）。必吃梅枝餅！", 
    keywords: "神社 參拜 梅枝餅 星巴克 花",
    url: "https://www.dazaifutenmangu.or.jp/"
  },
  { 
    id: 'bayside', 
    title: "Bayside Place 燈飾", 
    tag: "直到3/1", 
    color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30", 
    desc: "博多港塔旁邊的 Bayside Place 還有燈飾活動！海面上的倒影非常浪漫，且人潮比博多站少，適合悠閒散步。", 
    keywords: "燈飾 夜景 港口 約會",
    url: "https://www.baysideplace.jp/"
  },
  { 
    id: 'lalaport', 
    title: "LaLaport 福岡 (鋼彈)", 
    tag: "燈飾到2/3", 
    color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30", 
    desc: "除了看實物大鋼彈立像，這段期間還有冬季燈飾。購物中心很大，非常適合冬天躲避寒風逛街。", 
    keywords: "鋼彈 購物 逛街 室內",
    url: "https://mitsui-shopping-park.com/lalaport/fukuoka/"
  },
  { 
    id: 'musical', 
    title: "歌劇魅影 (劇團四季)", 
    tag: "運河城劇場", 
    color: "bg-purple-500/20 text-purple-300 border-purple-500/30", 
    desc: "如果懂日文或單純想體驗，這段期間博多運河城劇場正上演經典音樂劇《歌劇魅影》，機會難得。", 
    keywords: "表演 音樂劇 藝術 室內",
    url: "https://www.shiki.jp/applause/operaza/"
  },
  { 
    id: 'yatai', 
    title: "中洲/天神 屋台", 
    tag: "暖呼呼宵夜", 
    color: "bg-amber-500/20 text-amber-300 border-amber-500/30", 
    desc: "1月晚上很冷，這時候鑽進屋台吃熱騰騰的關東煮和豚骨拉麵最幸福了！記得穿保暖一點。", 
    keywords: "拉麵 晚餐 宵夜 喝酒 關東煮",
    url: "https://yokanavi.com/yatai/"
  }
];

// --- 確認對話框組件 ---
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-700/50 rounded-3xl w-full max-w-xs p-6 shadow-2xl relative animate-scale-up">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center mb-4 border border-red-500/20">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <p className="text-slate-400 text-sm leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={onCancel} 
            className="flex-1 py-3 bg-slate-800/80 text-slate-300 rounded-xl font-medium hover:bg-slate-700 transition-all border border-slate-700/50"
          >
            取消
          </button>
          <button 
            onClick={onConfirm} 
            className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-bold hover:from-red-500 hover:to-red-400 shadow-lg shadow-red-900/30 transition-all btn-press"
          >
            確認刪除
          </button>
        </div>
      </div>
    </div>
  );
};

// --- 用戶設置組件 ---
interface UserSetupProps {
  onComplete: (name: string) => void;
}

const UserSetup: React.FC<UserSetupProps> = ({ onComplete }) => {
  const [name, setName] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      localStorage.setItem('fukuoka_trip_user_name', name.trim());
      onComplete(name.trim());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-6 relative overflow-hidden">
      {/* 背景裝飾 */}
      <div className="absolute top-[-20%] right-[-15%] w-[500px] h-[500px] bg-gradient-to-br from-blue-600/30 to-purple-600/20 rounded-full blur-[120px] animate-blob"></div>
      <div className="absolute bottom-[-20%] left-[-15%] w-[500px] h-[500px] bg-gradient-to-br from-pink-600/20 to-orange-600/20 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-gradient-to-br from-cyan-600/10 to-blue-600/10 rounded-full blur-[80px] animate-pulse-slow"></div>
      
      {/* 飄落的櫻花裝飾 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <Cherry 
            key={i} 
            className="absolute text-pink-400/20 animate-float" 
            style={{ 
              left: `${15 + i * 15}%`, 
              top: `${10 + (i % 3) * 20}%`,
              animationDelay: `${i * 0.5}s`,
              width: `${20 + (i % 3) * 8}px`,
              height: `${20 + (i % 3) * 8}px`,
            }} 
          />
        ))}
      </div>

      <div className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 backdrop-blur-2xl p-10 rounded-[2rem] shadow-2xl w-full max-w-sm text-center border border-slate-700/50 z-10 relative">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-[1.5rem] rotate-3 flex items-center justify-center shadow-2xl shadow-blue-900/50 animate-glow">
              <Plane className="w-12 h-12 text-white -rotate-12" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* 標題 */}
        <h1 className="text-3xl font-black text-white mb-2">
          福岡之旅
        </h1>
        <p className="text-gradient font-bold text-lg mb-2">2026</p>
        <p className="text-slate-400 mb-8 text-sm">請輸入你的暱稱開始規劃旅程</p>

        {/* 表單 */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input 
              type="text"  
              className="w-full pl-12 pr-5 py-4 rounded-xl bg-slate-950/80 border border-slate-700/50 focus:border-blue-500 outline-none text-white placeholder-slate-500 transition-all input-glow" 
              placeholder="你的暱稱..."
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
              autoFocus 
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-xl shadow-blue-900/40 transition-all btn-press flex items-center justify-center gap-2"
          >
            <span>開始旅程</span>
            <Plane className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* 底部裝飾文字 */}
      <p className="absolute bottom-6 text-slate-600 text-xs">
        
      </p>
    </div>
  );
};

// --- 行程項目組件 ---
interface ItineraryItemProps {
  item: ItineraryItem;
  onDelete: (id: string) => void;
  onUpdate: (id: string, field: string, value: string) => void;
  dragHandleProps?: {
    attributes: React.HTMLAttributes<HTMLElement>;
    listeners: Record<string, Function> | undefined;
  };
}

const ItineraryItemComponent: React.FC<ItineraryItemProps> = ({ item, onDelete, onUpdate, dragHandleProps }) => {
  const [showMap, setShowMap] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  
  const config = useMemo(() => {
    switch (item.type) {
      case 'food': return { 
        icon: <Utensils className="w-3.5 h-3.5" />, 
        color: 'bg-orange-500/15 text-orange-400 border-orange-500/30', 
        dot: 'bg-gradient-to-br from-orange-400 to-orange-600',
        glow: 'shadow-orange-500/20'
      };
      case 'shopping': return { 
        icon: <ShoppingBag className="w-3.5 h-3.5" />, 
        color: 'bg-pink-500/15 text-pink-400 border-pink-500/30', 
        dot: 'bg-gradient-to-br from-pink-400 to-pink-600',
        glow: 'shadow-pink-500/20'
      };
      case 'transport': return { 
        icon: <Train className="w-3.5 h-3.5" />, 
        color: 'bg-blue-500/15 text-blue-400 border-blue-500/30', 
        dot: 'bg-gradient-to-br from-blue-400 to-blue-600',
        glow: 'shadow-blue-500/20'
      };
      default: return { 
        icon: <MapPin className="w-3.5 h-3.5" />, 
        color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', 
        dot: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
        glow: 'shadow-emerald-500/20'
      };
    }
  }, [item.type]);

  // Google Maps 嵌入 URL
  const mapEmbedUrl = useMemo(() => {
    const query = encodeURIComponent(`${item.title} 福岡`);
    return `https://www.google.com/maps?q=${query}&output=embed`;
  }, [item.title]);

  // 打開 Google Maps（在新視窗）
  const openGoogleMaps = () => {
    const query = encodeURIComponent(`${item.title} 福岡`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  // 開始編輯
  const startEdit = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  // 儲存編輯
  const saveEdit = () => {
    if (editingField && editValue.trim()) {
      onUpdate(item.id, editingField, editValue.trim());
    }
    setEditingField(null);
    setEditValue('');
  };

  // 取消編輯
  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  // 處理按鍵
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  return (
    <div className="flex gap-4 mb-6 relative pl-6 group">
      {/* 時間軸線條 */}
      <div className="absolute left-[11px] top-8 bottom-[-24px] w-[2px] bg-gradient-to-b from-slate-700/50 to-slate-800/30 group-last:hidden"></div>
      
      {/* 時間軸圓點 */}
      <div className={`absolute left-[4px] top-6 w-4 h-4 rounded-full border-[3px] border-slate-950 shadow-lg z-10 ${config.dot} ${config.glow}`}></div>
      
      {/* 卡片 */}
      <div className="flex-1 bg-gradient-to-br from-slate-900 to-slate-900/80 p-5 rounded-2xl border border-slate-800/80 relative group-hover:border-slate-700/80 transition-all duration-300 card-hover">
        {/* 拖拽把手 */}
        {dragHandleProps && (
          <div 
            {...dragHandleProps.attributes} 
            {...dragHandleProps.listeners}
            className="absolute top-3 left-3 p-2 text-slate-600 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl cursor-grab active:cursor-grabbing transition-all touch-none"
          >
            <GripVertical className="w-4 h-4" />
          </div>
        )}
        <button 
          onClick={() => onDelete(item.id)} 
          className="absolute top-3 right-3 p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        
        <div className="flex items-center gap-3 mb-3">
          {/* 時間 - 可編輯 */}
          {editingField === 'time' ? (
            <input
              type="time"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={handleKeyDown}
              autoFocus
              className="font-mono text-sm font-bold text-blue-400 bg-blue-500/20 px-3 py-1.5 rounded-lg border border-blue-500/50 outline-none w-24"
            />
          ) : (
            <button
              onClick={() => startEdit('time', item.time)}
              className="font-mono text-sm font-bold text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/40 transition-all cursor-pointer"
              title="點擊編輯時間"
            >
              {item.time}
            </button>
          )}
          <span className={`text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-medium border ${config.color}`}>
            {config.icon} {item.typeLabel}
          </span>
        </div>
        
        {/* 標題 - 可編輯 */}
        {editingField === 'title' ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full font-bold text-slate-100 text-lg mb-1.5 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-blue-500/50 outline-none"
            placeholder="輸入地點名稱"
          />
        ) : (
          <h3 
            onClick={() => startEdit('title', item.title)}
            className="font-bold text-slate-100 text-lg mb-1.5 hover:text-blue-400 cursor-pointer transition-colors"
            title="點擊編輯標題"
          >
            {item.title}
          </h3>
        )}
        
        {/* 備註 - 可編輯 */}
        {editingField === 'notes' ? (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={(e) => {
              if (e.key === 'Escape') cancelEdit();
            }}
            autoFocus
            className="w-full text-slate-400 text-sm leading-relaxed mb-3 bg-slate-800/50 px-3 py-2 rounded-lg border border-blue-500/50 outline-none resize-none h-20"
            placeholder="輸入備註（可選）"
          />
        ) : (
          <p 
            onClick={() => startEdit('notes', item.notes || '')}
            className={`text-sm leading-relaxed mb-3 cursor-pointer transition-colors ${
              item.notes ? 'text-slate-400 hover:text-blue-400' : 'text-slate-600 hover:text-slate-400 italic'
            }`}
            title="點擊編輯備註"
          >
            {item.notes || '+ 點擊新增備註'}
          </p>
        )}
        
        {/* 嵌入式 Google Maps */}
        {showMap && (
          <div className="mb-3 rounded-xl overflow-hidden border border-slate-700/50 animate-fade-in">
            <iframe
              src={mapEmbedUrl}
              width="100%"
              height="200"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full"
            />
          </div>
        )}
        
        <div className="flex justify-between items-center border-t border-slate-800/50 pt-3 mt-1">
          {/* 地圖按鈕 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMap(!showMap)}
              className={`flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg border transition-all ${
                showMap 
                  ? 'text-blue-400 bg-blue-500/20 border-blue-500/30' 
                  : 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              {showMap ? '隱藏地圖' : '顯示地圖'}
            </button>
            {showMap && (
              <button
                onClick={openGoogleMaps}
                className="flex items-center gap-1 text-[10px] font-medium text-slate-400 hover:text-blue-400 transition-all"
              >
                <ExternalLink className="w-3 h-3" />
                開啟
              </button>
            )}
          </div>
          
          <div className="text-[10px] font-medium text-slate-500 flex items-center gap-1.5 bg-slate-800/50 px-2.5 py-1 rounded-lg">
            <Users className="w-3 h-3" /> {item.createdBy}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 可拖拽行程項目 ---
interface SortableItemProps {
  item: ItineraryItem;
  onDelete: (id: string) => void;
  onUpdate: (id: string, field: string, value: string) => void;
}

const SortableItem: React.FC<SortableItemProps> = ({ item, onDelete, onUpdate }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ItineraryItemComponent
        item={item}
        onDelete={onDelete}
        onUpdate={onUpdate}
        dragHandleProps={{ attributes, listeners }}
      />
    </div>
  );
};

// --- 費用項目組件 ---
interface ExpenseItemProps {
  item: ExpenseItem;
  currentUserName: string;
  onDelete: (id: string) => void;
  onEdit: (item: ExpenseItem) => void;
  showTWD: boolean;
  exchangeRate: number;
}

const ExpenseItemComponent: React.FC<ExpenseItemProps> = ({ item, currentUserName, onDelete, onEdit, showTWD, exchangeRate }) => {
  const isMe = item.payer === currentUserName;
  const currency = item.currency || 'JPY'; // 舊資料預設為 JPY

  // 計算顯示金額
  const getDisplayAmount = () => {
    if (currency === 'TWD') {
      // 原始是台幣
      if (showTWD) {
        return { main: `NT$ ${Number(item.amount).toLocaleString()}`, sub: `≈ ¥${Math.round(Number(item.amount) / exchangeRate).toLocaleString()}` };
      } else {
        return { main: `¥${Math.round(Number(item.amount) / exchangeRate).toLocaleString()}`, sub: `= NT$ ${Number(item.amount).toLocaleString()}` };
      }
    } else {
      // 原始是日幣
      if (showTWD) {
        return { main: `NT$ ${Math.round(Number(item.amount) * exchangeRate).toLocaleString()}`, sub: `≈ ¥${Number(item.amount).toLocaleString()}` };
      } else {
        return { main: `¥${Number(item.amount).toLocaleString()}`, sub: null };
      }
    }
  };

  const displayAmount = getDisplayAmount();

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 p-4 rounded-2xl border border-slate-800/80 mb-3 flex justify-between items-center group hover:border-blue-500/30 transition-all card-hover">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-lg shadow-lg ${
          isMe 
            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-900/30' 
            : 'bg-gradient-to-br from-slate-700 to-slate-800 text-slate-300'
        }`}>
          {item.payer.charAt(0)}
        </div>
      <div>
          <h4 className="font-bold text-slate-200 text-[15px]">{item.description}</h4>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
            {item.createdAt ? new Date(item.createdAt.toDate()).toLocaleDateString('zh-TW') : ''}
            <span className={`text-[9px] px-1.5 py-0.5 rounded ${currency === 'TWD' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>
              {currency === 'TWD' ? '🇹🇼' : '🇯🇵'}
            </span>
          </p>
        </div>
      </div>
      <div className="text-right flex flex-col items-end">
        <div className="font-bold text-slate-200 text-lg tracking-tight">
          {displayAmount.main}
        </div>
        {displayAmount.sub && (
          <div className="text-[10px] text-slate-500">
            {displayAmount.sub}
          </div>
        )}
        {isMe && (
          <div className="flex gap-1 mt-1">
            <button 
              onClick={() => onEdit(item)} 
              className="text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-2 py-1 rounded-lg transition-all"
            >
              編輯
            </button>
            <button 
              onClick={() => onDelete(item.id)} 
              className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded-lg transition-all"
            >
              刪除
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- 筆記項目組件 ---
interface MemoItemProps {
  item: MemoItem;
  onDelete: (id: string) => void;
  onEdit: (item: MemoItem) => void;
}

const MemoItemComponent: React.FC<MemoItemProps> = ({ item, onDelete, onEdit }) => {
  const categoryColors: Record<string, string> = {
    '筆記': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    '購物': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    '航班': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    '住宿': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };
  
  return (
    <div 
      className="bg-gradient-to-br from-amber-900/20 to-yellow-900/10 p-5 rounded-2xl border border-yellow-700/20 relative group hover:-translate-y-1 transition-all duration-300"
    >
      <div className="absolute top-2 right-2 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-slate-950/70 rounded-lg p-1 backdrop-blur-sm">
        <button onClick={() => onEdit(item)} className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-all">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onDelete(item.id)} className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-all">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      
      <div className="flex items-center gap-2 mb-3">
        <StickyNote className="w-4 h-4 text-yellow-500" />
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${categoryColors[item.category] || categoryColors['筆記']}`}>
          {item.category || '筆記'}
        </span>
      </div>
      
      <p className="text-slate-200 font-medium leading-relaxed whitespace-pre-wrap text-sm">{item.content}</p>
      <div className="text-[10px] text-yellow-600/80 mt-4 text-right font-medium">By {item.createdBy}</div>
    </div>
  );
};

// --- 攻略卡片組件 ---
interface GuideCardProps {
  data: GuideItem;
  onHide: (id: string) => void;
}

const GuideCard: React.FC<GuideCardProps> = ({ data, onHide }) => (
  <div 
    className="bg-gradient-to-br from-slate-900 to-slate-900/80 rounded-2xl border border-slate-800/80 overflow-hidden mb-4 hover:border-blue-500/40 transition-all duration-300 group relative card-hover cursor-pointer"
    onClick={() => window.open(data.url, '_blank')}
  >
    <button 
      onClick={(e) => { e.stopPropagation(); onHide(data.id); }} 
      className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-slate-800/80 backdrop-blur rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-700 border border-slate-700/50 z-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
    >
      <EyeOff className="w-4 h-4" />
    </button>
    
    <div className="p-5">
      <div className="flex justify-between items-start mb-3 pr-8">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-lg text-slate-100 group-hover:text-blue-400 transition-colors">{data.title}</h3>
          <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100" />
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg whitespace-nowrap border ${data.color}`}>
          {data.tag}
        </span>
      </div>
      
      <p className="text-slate-400 text-sm leading-relaxed">{data.desc}</p>
      
      <div className="mt-4 pt-3 border-t border-slate-800/50 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {data.keywords.split(' ').map((k: string) => (
            <span 
              key={k} 
              className="text-[10px] text-slate-500 bg-slate-800/50 px-2 py-1 rounded-lg border border-slate-700/50 hover:text-blue-400 hover:border-blue-500/30 cursor-pointer transition-all"
              onClick={(e) => {
                e.stopPropagation();
                window.open(`https://www.google.com/search?q=福岡+${k}`, '_blank');
              }}
            >
              #{k}
            </span>
          ))}
        </div>
        <span className="text-[10px] text-blue-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          點擊查看 <ExternalLink className="w-3 h-3" />
        </span>
      </div>
    </div>
  </div>
);

// --- 主程式 ---
// 預設匯率（備用）
const DEFAULT_JPY_TO_TWD_RATE = 0.22;

const FukuokaApp: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [activeTab, setActiveTab] = useState('itinerary');
  const [isSetup, setIsSetup] = useState(false);
  
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [memos, setMemos] = useState<MemoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [hiddenGuideIds, setHiddenGuideIds] = useState<string[]>([]);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [exchangeRate, setExchangeRate] = useState(DEFAULT_JPY_TO_TWD_RATE);
  const [showTWD, setShowTWD] = useState(false);
  const [rateLoading, setRateLoading] = useState(false);
  const [rateLastUpdated, setRateLastUpdated] = useState<string | null>(null);
  
  const [showAddItinerary, setShowAddItinerary] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddMemo, setShowAddMemo] = useState(false);
  
  const [editingMemo, setEditingMemo] = useState<MemoItem | null>(null);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [newItem, setNewItem] = useState({ day: 'Day 1', time: '10:00', title: '', type: 'sightseeing', notes: '' });
  const [newExpense, setNewExpense] = useState({ description: '', amount: '', payer: '', currency: 'JPY' as 'JPY' | 'TWD' });
  const [newMemo, setNewMemo] = useState({ content: '', category: '筆記' });

  // 拖拽排序 sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 拖拽結束處理
  const handleDragEnd = async (event: DragEndEvent, dayItems: ItineraryItem[]) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = dayItems.findIndex((item) => item.id === active.id);
      const newIndex = dayItems.findIndex((item) => item.id === over.id);
      
      const reorderedItems = arrayMove(dayItems, oldIndex, newIndex);
      
      // 更新每個項目的時間來反映新順序
      // 使用拖拽後的順序來生成新的時間
      const baseTime = dayItems[0]?.time || '09:00';
      const [baseHour, baseMinute] = baseTime.split(':').map(Number);
      
      for (let i = 0; i < reorderedItems.length; i++) {
        const newHour = baseHour + Math.floor((baseMinute + i * 60) / 60);
        const newMinute = (baseMinute + i * 60) % 60;
        const newTime = `${String(newHour).padStart(2, '0')}:${String(newMinute).padStart(2, '0')}`;
        
        try {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'itinerary', reorderedItems[i].id), {
            time: newTime
          });
        } catch (error) {
          console.error('更新排序失敗:', error);
        }
      }
    }
  };

  // 獲取即時匯率
  const fetchExchangeRate = async () => {
    setRateLoading(true);
    try {
      // 使用免費的 ExchangeRate-API（不需要 API 金鑰）
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/JPY');
      const data = await response.json();
      
      if (data && data.rates && data.rates.TWD) {
        // 加上 0.01 以更符合銀行實際換匯匯率
        const rate = data.rates.TWD + 0.01;
        setExchangeRate(rate);
        setRateLastUpdated(new Date().toLocaleString('zh-TW'));
        // 儲存到 localStorage 作為快取
        localStorage.setItem('fukuoka_exchange_rate', JSON.stringify({
          rate,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.error('無法獲取匯率:', error);
      // 嘗試從快取讀取
      const cached = localStorage.getItem('fukuoka_exchange_rate');
      if (cached) {
        try {
          const { rate } = JSON.parse(cached);
          setExchangeRate(rate);
          setRateLastUpdated('(快取)');
        } catch (e) {
          console.error(e);
        }
      }
    } finally {
      setRateLoading(false);
    }
  };

  useEffect(() => {
    const savedName = localStorage.getItem('fukuoka_trip_user_name');
    if (savedName) { 
      setUserName(savedName); 
      setIsSetup(true); 
      setNewExpense(prev => ({ ...prev, payer: savedName })); 
    }
    const savedHidden = localStorage.getItem('fukuoka_hidden_guides');
    if (savedHidden) { 
      try { setHiddenGuideIds(JSON.parse(savedHidden)); } catch(e) { console.error(e); } 
    }
    
    // 載入時獲取匯率
    fetchExchangeRate();
    
    signInAnonymously(auth).catch(err => console.error("Auth error:", err));
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      // 如果 5 秒後還沒有 user，停止 loading
      const timeout = setTimeout(() => {
        setLoading(false);
      }, 5000);
      return () => clearTimeout(timeout);
    }
    
    const unsub1 = onSnapshot(
      query(collection(db, 'artifacts', appId, 'public', 'data', 'itinerary')), 
      (snap) => {
        const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ItineraryItem[];
        items.sort((a, b) => (a.day !== b.day ? a.day.localeCompare(b.day) : a.time.localeCompare(b.time)));
        setItinerary(items); 
        setLoading(false);
      },
      (error) => {
        console.error('Firestore error:', error);
        setLoading(false);
      }
    );
    
    const unsub2 = onSnapshot(
      query(collection(db, 'artifacts', appId, 'public', 'data', 'expenses'), orderBy('createdAt', 'desc')), 
      (snap) => setExpenses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ExpenseItem[]),
      (error) => console.error('Expenses error:', error)
    );
    
    const unsub3 = onSnapshot(
      query(collection(db, 'artifacts', appId, 'public', 'data', 'memos'), orderBy('createdAt', 'desc')), 
      (snap) => setMemos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MemoItem[]),
      (error) => console.error('Memos error:', error)
    );
    
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [user]);

  const requestConfirm = (title: string, message: string, action: () => void) => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm: () => { action(); setConfirmDialog(prev => ({ ...prev, isOpen: false })); } });
  };

  const handleAddItinerary = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!user) return;
    
    // 先關閉 modal
    setShowAddItinerary(false);
    
    let typeLabel = '景點';
    if(newItem.type === 'food') typeLabel = '美食';
    if(newItem.type === 'shopping') typeLabel = '購物';
    if(newItem.type === 'transport') typeLabel = '交通';
    
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'itinerary'), { 
        ...newItem, 
        typeLabel, 
        createdBy: userName, 
        createdAt: serverTimestamp() 
      });
    } catch (error) {
      console.error('新增行程失敗:', error);
    }
    
    setNewItem({ day: 'Day 1', time: '10:00', title: '', type: 'sightseeing', notes: '' });
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!user) return;
    
    // 先關閉 modal
    setShowAddExpense(false);
    
    try {
      if (editingExpense) {
        // 編輯模式
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', editingExpense.id), {
          description: newExpense.description, 
          amount: Number(newExpense.amount), 
          payer: newExpense.payer || userName,
          currency: newExpense.currency,
        });
      } else {
        // 新增模式
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'expenses'), { 
          description: newExpense.description, 
          amount: Number(newExpense.amount), 
          payer: newExpense.payer || userName,
          currency: newExpense.currency,
          createdAt: serverTimestamp() 
        });
      }
    } catch (error) {
      console.error('記帳操作失敗:', error);
    }
    
    setEditingExpense(null);
    setNewExpense({ description: '', amount: '', payer: userName, currency: 'JPY' });
  };

  const handleSaveMemo = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!user) return;
    
    // 先關閉 modal
    setShowAddMemo(false);
    
    try {
      if (editingMemo) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'memos', editingMemo.id), { 
          content: newMemo.content, 
          category: newMemo.category, 
          updatedAt: serverTimestamp() 
        });
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'memos'), { 
          ...newMemo, 
          createdBy: userName, 
          createdAt: serverTimestamp() 
        });
      }
    } catch (error) {
      console.error('儲存筆記失敗:', error);
    }
    
    setEditingMemo(null); 
    setNewMemo({ content: '', category: '筆記' });
  };


  const filteredGuide = useMemo(() => {
    let data = GUIDE_DATA.filter(item => !hiddenGuideIds.includes(item.id));
    if (!searchTerm) return data;
    return data.filter(item => 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.keywords.includes(searchTerm)
    );
  }, [searchTerm, hiddenGuideIds]);

  const expenseStats = useMemo(() => {
    const total = expenses.reduce((acc, cur) => acc + (Number(cur.amount) || 0), 0);
    const payers = Array.from(new Set(expenses.map(e => e.payer)));
    const breakdown: Record<string, number> = {};
    payers.forEach(p => breakdown[p] = expenses.filter(e => e.payer === p).reduce((acc, cur) => acc + (Number(cur.amount) || 0), 0));
    return { total, breakdown, payers };
  }, [expenses]);

  const days = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];

  if (!isSetup) return <UserSetup onComplete={(name) => { setUserName(name); setIsSetup(true); setNewExpense(p => ({ ...p, payer: name })); }} />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28 font-sans selection:bg-blue-500/30">
      {/* 背景裝飾 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-[100px]"></div>
      </div>
      
      <ConfirmDialog 
        isOpen={confirmDialog.isOpen} 
        title={confirmDialog.title} 
        message={confirmDialog.message} 
        onConfirm={confirmDialog.onConfirm} 
        onCancel={() => setConfirmDialog(p => ({ ...p, isOpen: false }))} 
      />
      
      {/* 頂部導航 */}
      <header className="fixed top-0 left-0 right-0 z-20 glass-nav">
        <div className="max-w-md mx-auto px-5 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/30">
              <Plane className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100">福岡之旅</h1>
              <p className="text-[10px] text-slate-500 font-medium">2026.01.13 - 01.19</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs font-bold text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20">
              {userName}
            </div>
            <button 
              onClick={() => { localStorage.removeItem('fukuoka_trip_user_name'); setIsSetup(false); }} 
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-all border border-slate-700/50"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 主要內容 */}
      <main className="max-w-md mx-auto px-5 pt-24 relative z-10">
        {/* 行程頁面 */}
        {activeTab === 'itinerary' && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h2 className="text-2xl font-black text-slate-100">行程總覽</h2>
                <p className="text-sm text-slate-500 mt-1">與朋友的共同回憶</p>
              </div>
              <button 
                onClick={() => setShowAddItinerary(true)} 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white w-11 h-11 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/30 transition-all btn-press"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            
            {/* 天數快速導航 */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide -mx-1 px-1">
              {days.map((day, index) => {
                const dayItems = itinerary.filter(i => i.day === day);
                const hasItems = dayItems.length > 0;
                return (
                  <button
                    key={day}
                    onClick={() => {
                      const element = document.getElementById(`day-${index + 1}`);
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border ${
                      hasItems
                        ? 'bg-gradient-to-br from-blue-600/20 to-indigo-600/20 text-blue-400 border-blue-500/30 hover:from-blue-600/30 hover:to-indigo-600/30'
                        : 'bg-slate-900/50 text-slate-500 border-slate-800/50 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span>Day {index + 1}</span>
                      {hasItems && (
                        <span className="text-[10px] text-blue-300/70">{dayItems.length} 項</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            
            {loading ? (
              <div className="text-center py-20">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-500">載入中...</p>
              </div>
            ) : itinerary.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-800">
                <Calendar className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500">還沒有行程</p>
                <p className="text-slate-600 text-sm mt-1">點擊右上角 + 開始規劃</p>
              </div>
            ) : (
              <div className="space-y-10 pb-10">
                {days.map((day, index) => {
                  const dayItems = itinerary.filter(i => i.day === day);
                  if (dayItems.length === 0) return null;
                  return (
                    <div key={day} id={`day-${index + 1}`} className="relative scroll-mt-28">
                      <div className="sticky top-[72px] z-10 bg-slate-950/95 backdrop-blur-sm py-2 mb-4 flex items-center gap-3">
                        <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-blue-400 font-bold text-xs border border-blue-500/20">
                          {day}
                        </span>
                        <span className="text-[10px] text-slate-600 flex items-center gap-1">
                          <GripVertical className="w-3 h-3" /> 拖拽排序
                        </span>
                      </div>
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event) => handleDragEnd(event, dayItems)}
                      >
                        <SortableContext
                          items={dayItems.map(item => item.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-1">
                            {dayItems.map(item => (
                              <SortableItem
                                key={item.id} 
                                item={item} 
                                onDelete={(id: string) => requestConfirm(
                                  '刪除行程', 
                                  '確定要刪除這個行程嗎？', 
                                  async () => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'itinerary', id))
                                )}
                                onUpdate={async (id: string, field: string, value: string) => {
                                  try {
                                    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'itinerary', id), {
                                      [field]: value
                                    });
                                  } catch (error) {
                                    console.error('更新行程失敗:', error);
                                  }
                                }}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 記帳頁面 */}
        {activeTab === 'expenses' && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-100">共用錢包</h2>
                <p className="text-sm text-slate-500 mt-1">分攤費用一目了然</p>
              </div>
              <button 
                onClick={() => { 
                  setEditingExpense(null); 
                  setNewExpense({ description: '', amount: '', payer: userName, currency: 'JPY' }); 
                  setShowAddExpense(true); 
                }} 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white w-11 h-11 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/30 transition-all btn-press"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            
            {/* 幣別切換 */}
            <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800/50 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">顯示幣別：</span>
                  <div className="flex bg-slate-800/80 rounded-lg p-1">
                    <button
                      onClick={() => setShowTWD(false)}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                        !showTWD 
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                          : 'text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      ¥ 日圓
                    </button>
                    <button
                      onClick={() => setShowTWD(true)}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                        showTWD 
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg' 
                          : 'text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      NT$ 台幣
                    </button>
                  </div>
                </div>
                <button
                  onClick={fetchExchangeRate}
                  disabled={rateLoading}
                  className="p-2 rounded-lg bg-slate-800/80 text-slate-400 hover:text-blue-400 hover:bg-slate-700/80 transition-all disabled:opacity-50"
                  title="更新匯率"
                >
                  {rateLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>
                  即時匯率: 1¥ ≈ NT$ {exchangeRate.toFixed(4)}
                </span>
                {rateLastUpdated && (
                  <span className="text-slate-600">
                    更新: {rateLastUpdated}
                  </span>
                )}
              </div>
            </div>
            
            {/* 統計卡片 */}
            <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 rounded-3xl p-7 text-white shadow-2xl border border-slate-700/30 mb-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-[60px]"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[50px]"></div>
              
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                  <div className="text-slate-400 text-xs font-medium uppercase tracking-widest mb-1">Total Expenses</div>
                  <div className="text-4xl font-black">
                    {showTWD ? (
                      <>NT$ {Math.round(expenseStats.total * exchangeRate).toLocaleString()}</>
                    ) : (
                      <>¥{expenseStats.total.toLocaleString()}</>
                    )}
                  </div>
                  {showTWD && (
                    <div className="text-sm text-slate-500 mt-1">
                      ≈ ¥{expenseStats.total.toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10">
                  <Wallet className="w-6 h-6 text-blue-300" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-y-4 gap-x-6 pt-6 border-t border-white/10 relative z-10">
                {expenseStats.payers.map(payer => (
                  <div key={payer}>
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">{payer} 已付</div>
                    <div className="font-mono text-xl font-bold text-blue-300">
                      {showTWD ? (
                        <>NT$ {Math.round(expenseStats.breakdown[payer] * exchangeRate).toLocaleString()}</>
                      ) : (
                        <>¥{expenseStats.breakdown[payer].toLocaleString()}</>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-2 pb-10">
              {expenses.map(item => (
                <ExpenseItemComponent 
                  key={item.id} 
                  item={item} 
                  currentUserName={userName} 
                  showTWD={showTWD}
                  exchangeRate={exchangeRate}
                  onDelete={(id: string) => requestConfirm(
                    '刪除記帳', 
                    '確定要刪除這筆記帳嗎？', 
                    async () => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', id))
                  )}
                  onEdit={(expense: ExpenseItem) => {
                    setEditingExpense(expense);
                    setNewExpense({
                      description: expense.description,
                      amount: String(expense.amount),
                      payer: expense.payer,
                      currency: expense.currency || 'JPY'
                    });
                    setShowAddExpense(true);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* 筆記頁面 */}
        {activeTab === 'memos' && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-100">隨手筆記</h2>
                <p className="text-sm text-slate-500 mt-1">購物清單、重要資訊...</p>
              </div>
              <button 
                onClick={() => { setEditingMemo(null); setNewMemo({ content: '', category: '筆記' }); setShowAddMemo(true); }} 
                className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white w-11 h-11 rounded-xl flex items-center justify-center shadow-lg shadow-orange-900/30 transition-all btn-press"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* 航班資訊區塊 - 置頂 */}
            <div className="mb-6 bg-gradient-to-br from-slate-900 to-slate-900/80 rounded-2xl border border-slate-800/80 overflow-hidden">
              {/* 標題列 */}
              <div className="px-5 py-4 flex items-center gap-3 border-b border-slate-800/50">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Plane className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100">航班資訊</h3>
                  <p className="text-[11px] text-slate-500">AirAsia 馬來西亞亞洲航空</p>
                </div>
              </div>
              
              {/* 航班詳情 */}
              <div className="px-5 py-4 space-y-3">
                {/* 去程 */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
                  <div className="flex items-center gap-2 mb-3">
                    <PlaneTakeoff className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md">去程</span>
                    <span className="text-xs text-slate-500">2026-01-13（一）</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <p className="text-xl font-bold text-slate-100">TPE</p>
                      <p className="text-sm text-slate-400">11:55</p>
                      <p className="text-[10px] text-slate-600">桃園 T1</p>
                    </div>
                    <div className="flex-1 flex items-center justify-center px-4">
                      <div className="flex-1 h-[1px] bg-gradient-to-r from-slate-700 to-slate-600"></div>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText('AK1510');
                          alert('已複製航班號碼 AK1510');
                        }}
                        className="px-3 text-center hover:bg-slate-700/50 rounded-lg py-1 transition-all cursor-pointer group"
                        title="點擊複製航班號碼"
                      >
                        <p className="text-[10px] text-slate-500 font-medium">AirAsia</p>
                        <p className="text-sm font-bold text-slate-300 group-hover:text-sky-400 transition-colors">AK1510</p>
                        <p className="text-[10px] text-slate-600 group-hover:text-sky-400/70">點擊複製</p>
                      </button>
                      <div className="flex-1 h-[1px] bg-gradient-to-r from-slate-600 to-slate-700"></div>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-slate-100">FUK</p>
                      <p className="text-sm text-slate-400">15:15</p>
                      <p className="text-[10px] text-slate-600">福岡</p>
                    </div>
                  </div>
                </div>
                
                {/* 回程 */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
                  <div className="flex items-center gap-2 mb-3">
                    <PlaneLanding className="w-4 h-4 text-orange-400" />
                    <span className="text-xs font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md">回程</span>
                    <span className="text-xs text-slate-500">2026-01-19（日）</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <p className="text-xl font-bold text-slate-100">FUK</p>
                      <p className="text-sm text-slate-400">16:55</p>
                      <p className="text-[10px] text-slate-600">福岡</p>
                    </div>
                    <div className="flex-1 flex items-center justify-center px-4">
                      <div className="flex-1 h-[1px] bg-gradient-to-r from-slate-700 to-slate-600"></div>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText('AK1511');
                          alert('已複製航班號碼 AK1511');
                        }}
                        className="px-3 text-center hover:bg-slate-700/50 rounded-lg py-1 transition-all cursor-pointer group"
                        title="點擊複製航班號碼"
                      >
                        <p className="text-[10px] text-slate-500 font-medium">AirAsia</p>
                        <p className="text-sm font-bold text-slate-300 group-hover:text-orange-400 transition-colors">AK1511</p>
                        <p className="text-[10px] text-slate-600 group-hover:text-orange-400/70">點擊複製</p>
                      </button>
                      <div className="flex-1 h-[1px] bg-gradient-to-r from-slate-600 to-slate-700"></div>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-slate-100">TPE</p>
                      <p className="text-sm text-slate-400">18:30</p>
                      <p className="text-[10px] text-slate-600">桃園 T1</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {memos.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-800">
                <StickyNote className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500">還沒有筆記</p>
                <p className="text-slate-600 text-sm mt-1">點擊右上角 + 開始記錄</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 pb-10">
                {memos.map(item => (
                  <MemoItemComponent 
                    key={item.id} 
                    item={item} 
                    onDelete={(id: string) => requestConfirm(
                      '刪除筆記', 
                      '確定要刪除這則筆記嗎？', 
                      async () => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'memos', id))
                    )} 
                    onEdit={(item: MemoItem) => { 
                      setEditingMemo(item); 
                      setNewMemo({ content: item.content, category: item.category }); 
                      setShowAddMemo(true); 
                    }} 
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 攻略頁面 */}
        {activeTab === 'guide' && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-100">1 月攻略</h2>
                <p className="text-sm text-slate-500 mt-1">為你整理的福岡精華</p>
              </div>
              {hiddenGuideIds.length > 0 && (
                <button 
                  onClick={() => requestConfirm(
                    '重置攻略', 
                    '要恢復顯示所有隱藏的攻略嗎？', 
                    () => { setHiddenGuideIds([]); localStorage.removeItem('fukuoka_hidden_guides'); }
                  )} 
                  className="text-xs font-bold text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-blue-500/20 hover:bg-blue-500/20 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> 重置
                </button>
              )}
            </div>
            
            {/* 搜尋框 */}
            <div className="relative mb-8 group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              </div>
              <input 
                type="text" 
                placeholder="搜尋攻略... (按 Enter 搜尋 Google)" 
                className="w-full pl-12 pr-24 py-4 bg-slate-900/80 border border-slate-800 rounded-2xl outline-none text-slate-100 placeholder-slate-500 focus:border-blue-500/50 transition-all input-glow" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchTerm.trim()) {
                    window.open(`https://www.google.com/search?q=福岡+${encodeURIComponent(searchTerm)}`, '_blank');
                  }
                }}
              />
              {searchTerm && (
                <button
                  onClick={() => window.open(`https://www.google.com/search?q=福岡+${encodeURIComponent(searchTerm)}`, '_blank')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all btn-press"
                >
                  <Search className="w-3.5 h-3.5" />
                  搜尋
                </button>
              )}
            </div>
            
            <div className="space-y-2 pb-10">
              {filteredGuide.map(item => (
                <GuideCard 
                  key={item.id} 
                  data={item} 
                  onHide={(id: string) => { 
                    const n = [...hiddenGuideIds, id]; 
                    setHiddenGuideIds(n); 
                    localStorage.setItem('fukuoka_hidden_guides', JSON.stringify(n)); 
                  }} 
                />
              ))}
            </div>
            
            {filteredGuide.length > 0 && searchTerm && (
              <div className="mt-4 mb-10 text-center">
                <button 
                  onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent('福岡 ' + searchTerm)}`, '_blank')} 
                  className="text-sm text-slate-500 hover:text-blue-400 flex items-center justify-center gap-1.5 mx-auto px-4 py-2 hover:bg-slate-900 rounded-xl transition-all"
                >
                  想要更多資訊？ <ExternalLink className="w-3.5 h-3.5" /> 在 Google 搜尋
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 底部導航 */}
      <nav className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-30 w-full max-w-[360px] px-4">
        <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-2xl shadow-black/50 rounded-2xl px-2 py-2 flex justify-between items-center h-[68px]">
          {[
            { id: 'itinerary', icon: Calendar, label: '行程' },
            { id: 'expenses', icon: CreditCard, label: '記帳' },
            { id: 'memos', icon: NotebookPen, label: '筆記' },
            { id: 'guide', icon: MapPin, label: '攻略' },
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)} 
              className={`flex flex-col items-center justify-center w-full h-full rounded-xl transition-all duration-300 ${
                activeTab === tab.id 
                  ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/40' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <tab.icon className={`w-5 h-5 mb-0.5 ${activeTab === tab.id ? 'text-white' : ''}`} />
              {activeTab === tab.id && (
                <span className="text-[10px] font-bold animate-scale-up">{tab.label}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* 新增行程 Modal */}
      {showAddItinerary && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-700/50 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative animate-scale-up">
            <button onClick={() => setShowAddItinerary(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-100">新增行程</h3>
            </div>
            
            <form onSubmit={handleAddItinerary} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <select 
                  className="w-full p-3.5 bg-slate-950/80 border border-slate-700/50 rounded-xl text-slate-200 outline-none focus:border-blue-500/50 transition-all" 
                  value={newItem.day} 
                  onChange={e => setNewItem({...newItem, day: e.target.value})}
                >
                  {days.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <input 
                  type="time" 
                  className="w-full p-3.5 bg-slate-950/80 border border-slate-700/50 rounded-xl text-slate-200 outline-none focus:border-blue-500/50 transition-all" 
                  value={newItem.time} 
                  onChange={e => setNewItem({...newItem, time: e.target.value})} 
                  required 
                />
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'sightseeing', label: '景點', icon: MapPin },
                  { id: 'food', label: '美食', icon: Utensils },
                  { id: 'shopping', label: '購物', icon: ShoppingBag },
                  { id: 'transport', label: '交通', icon: Train },
                ].map(t => (
                  <button 
                    key={t.id} 
                    type="button" 
                    onClick={() => setNewItem({...newItem, type: t.id})} 
                    className={`py-2.5 text-xs rounded-xl font-bold flex flex-col items-center gap-1 transition-all ${
                      newItem.type === t.id 
                        ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg' 
                        : 'bg-slate-800/80 text-slate-400 border border-slate-700/50 hover:bg-slate-700/80'
                    }`}
                  >
                    <t.icon className="w-4 h-4" />
                    {t.label}
                  </button>
                ))}
              </div>
              
              <input 
                type="text" 
                placeholder="標題（例：博多運河城）" 
                className="w-full p-3.5 bg-slate-950/80 border border-slate-700/50 rounded-xl text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500/50 transition-all" 
                value={newItem.title} 
                onChange={e => setNewItem({...newItem, title: e.target.value})} 
                required 
              />
              
              <textarea 
                placeholder="備註（選填）" 
                className="w-full p-3.5 bg-slate-950/80 border border-slate-700/50 rounded-xl text-slate-200 placeholder-slate-500 h-24 outline-none focus:border-blue-500/50 transition-all resize-none" 
                value={newItem.notes} 
                onChange={e => setNewItem({...newItem, notes: e.target.value})} 
              />
              
              <button 
                type="submit" 
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-blue-900/30 transition-all btn-press"
              >
                新增行程
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 新增費用 Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-700/50 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative animate-scale-up">
            <button onClick={() => { setShowAddExpense(false); setEditingExpense(null); }} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-100">{editingExpense ? '編輯記帳' : '記一筆'}</h3>
            </div>
            
            <form onSubmit={handleAddExpense} className="space-y-4">
              <input 
                type="text" 
                placeholder="誰付的" 
                className="w-full p-3.5 bg-slate-950/80 border border-slate-700/50 rounded-xl text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500/50 transition-all" 
                value={newExpense.payer} 
                onChange={e => setNewExpense({...newExpense, payer: e.target.value})} 
                required 
              />
              
              <input 
                type="text" 
                placeholder="買了什麼" 
                className="w-full p-3.5 bg-slate-950/80 border border-slate-700/50 rounded-xl text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500/50 transition-all" 
                value={newExpense.description} 
                onChange={e => setNewExpense({...newExpense, description: e.target.value})} 
                required 
              />
              
              {/* 幣別選擇 */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewExpense({...newExpense, currency: 'JPY'})}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                    newExpense.currency === 'JPY'
                      ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-900/30'
                      : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  🇯🇵 日幣 JPY
                </button>
                <button
                  type="button"
                  onClick={() => setNewExpense({...newExpense, currency: 'TWD'})}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                    newExpense.currency === 'TWD'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-900/30'
                      : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  🇹🇼 台幣 TWD
                </button>
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                  {newExpense.currency === 'JPY' ? '¥' : 'NT$'}
                </span>
                <input 
                  type="number" 
                  placeholder="金額" 
                  className={`w-full p-3.5 ${newExpense.currency === 'JPY' ? 'pl-10' : 'pl-14'} bg-slate-950/80 border border-slate-700/50 rounded-xl text-slate-200 placeholder-slate-500 font-bold text-xl outline-none focus:border-blue-500/50 transition-all`}
                  value={newExpense.amount} 
                  onChange={e => setNewExpense({...newExpense, amount: e.target.value})} 
                  required 
                />
              </div>
              
              <button 
                type="submit" 
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-900/30 transition-all btn-press"
              >
                {editingExpense ? '更新' : '儲存'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 新增/編輯筆記 Modal */}
      {showAddMemo && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-700/50 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative animate-scale-up">
            <button onClick={() => setShowAddMemo(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
                <StickyNote className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-100">{editingMemo ? '編輯筆記' : '貼便利貼'}</h3>
            </div>
            
            <form onSubmit={handleSaveMemo} className="space-y-4">
              <div className="flex gap-2">
                {['筆記', '購物', '航班', '住宿'].map(cat => (
                  <button 
                    key={cat} 
                    type="button" 
                    onClick={() => setNewMemo({...newMemo, category: cat})} 
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                      newMemo.category === cat 
                        ? 'bg-gradient-to-br from-yellow-500 to-orange-500 border-yellow-500/50 text-white shadow-lg' 
                        : 'bg-slate-950/80 border-slate-700/50 text-slate-500 hover:bg-slate-800/80'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              
              <textarea 
                placeholder="寫下你的筆記..." 
                className="w-full p-4 bg-slate-950/80 border border-slate-700/50 rounded-xl text-slate-200 placeholder-slate-500 h-36 outline-none focus:border-yellow-500/50 transition-all resize-none" 
                value={newMemo.content} 
                onChange={e => setNewMemo({...newMemo, content: e.target.value})} 
                required 
                autoFocus 
              />
              
              <button 
                type="submit" 
                className="w-full py-4 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white rounded-xl font-bold shadow-lg shadow-orange-900/30 transition-all btn-press"
              >
                {editingMemo ? '更新筆記' : '貼上'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default FukuokaApp;
