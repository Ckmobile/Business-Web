



export default {
   
    PREFIX: ".",
    OWNER_NUMBER: "94750292806",
    BOT_NAME: "QUEEN RASHU V4",
    WORK_TYPE: "public", 
    AUTO_TYPING: false, 
    AUTO_RECORDING: true,  
    ALWAYS_ONLINE: false,   
    ALWAYS_OFFLINE: true,  
    AUTO_READ: false,       
    READ_CMD_ONLY: true,   
    AUTO_BIO: true,        
    AUTO_REACT: false,    
    REACT_EMOJIS: ['❤️','💕','😻','🧡','💛','💚','💙','💜','🎉','👋'],
    AUTO_READ_STATUS: true, 
    AUTO_VIEW_STATUS: true, 
    AUTO_LIKE_STATUS: true, 
    AUTO_LIKE_EMOJI: ['❤️', '🔥', '👍', '😂', '😮'], 
    ANTI_BOT: false,        
    ANTI_BAD: false,        
    ANTI_LINK: false,      
    NEWSLETTER_JID: "120363405651321253@newsletter", 
    GROUP_INVITE_LINK: "https://chat.whatsapp.com/HYUUuMJYiPGHH6P3Ez78he?mode=gi_t",  
    MAX_RETRIES: 3,        
    RCD_IMAGE_PATH: "",
    ANTI_DELETE: "off", // values: off, me, public
    AUTO_SAVE_CONTACTS: "off", // values: off, auto, ask
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/auth/google/callback"
};
