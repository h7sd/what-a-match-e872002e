import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { useState, useRef } from 'react';
import { useInView } from 'framer-motion';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "What is UserVault?",
    answer: "UserVault is a modern link-in-bio platform that lets you create stunning, customizable profile pages. Share all your social links, showcase your work, and express your personality with effects like sparkles, music, and live Discord status."
  },
  {
    question: "Is UserVault free?",
    answer: "Yes! UserVault is completely free to use. Create your personalized bio page with all core features at no cost. We believe everyone deserves a beautiful online presence."
  },
  {
    question: "What can I do with UserVault?",
    answer: "You can create a personalized profile page with custom backgrounds, music, social links, badges, and visual effects. Show your Discord status in real-time, upload custom cursors, and much more."
  },
  {
    question: "Why use UserVault over other link-in-bio tools?",
    answer: "UserVault offers unmatched customization with features like background videos, particle effects, custom themes, and live integrations. Our platform is designed for creators who want to stand out."
  },
  {
    question: "Is UserVault safe?",
    answer: "Absolutely. We use industry-standard encryption and security practices. Your data is stored securely, and we never share your personal information with third parties."
  },
  {
    question: "How long does setup take?",
    answer: "You can have your profile up and running in under 5 minutes. Simply sign up, choose your username, add your links, and customize your page to your liking."
  }
];

function FAQItemComponent({ item, index, isOpen, onToggle }: { 
  item: FAQItem; 
  index: number; 
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 * index, duration: 0.5 }}
      className="group"
    >
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-6 text-left rounded-2xl transition-all duration-300 ${
          isOpen 
            ? 'bg-primary/10 border border-primary/20' 
            : 'bg-card/40 border border-border/30 hover:border-primary/20 hover:bg-card/60'
        }`}
      >
        <span className={`font-semibold pr-4 transition-colors duration-300 ${
          isOpen ? 'text-primary' : 'text-foreground group-hover:text-primary'
        }`}>
          {item.question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300 ${
            isOpen ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground'
          }`}
        >
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="text-muted-foreground leading-relaxed px-6 py-5 bg-card/20 rounded-b-2xl border-x border-b border-border/20">
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FAQSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section ref={ref} className="py-32 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <HelpCircle className="w-4 h-4" />
            FAQ
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about UserVault
          </p>
        </motion.div>

        {/* FAQ Items */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-4"
        >
          {faqs.map((faq, index) => (
            <FAQItemComponent 
              key={index} 
              item={faq} 
              index={index}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
