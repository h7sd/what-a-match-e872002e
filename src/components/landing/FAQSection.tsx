import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { FadeIn } from './FadeIn';

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

function FAQItem({ item, index }: { item: FAQItem; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * index, duration: 0.4 }}
      className="border-b border-border/30 last:border-0 mx-4"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="text-foreground font-medium group-hover:text-primary transition-colors">
          {item.question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </motion.div>
      </button>
      <motion.div
        initial={false}
        animate={{ 
          height: isOpen ? 'auto' : 0,
          opacity: isOpen ? 1 : 0
        }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="overflow-hidden"
      >
        <p className="text-muted-foreground text-sm pb-5 leading-relaxed">
          {item.answer}
        </p>
      </motion.div>
    </motion.div>
  );
}

export function FAQSection() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground">
            Everything you need to know about UserVault
          </p>
        </div>

        <div className="glass-card p-2">
          {faqs.map((faq, index) => (
            <FAQItem key={index} item={faq} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
