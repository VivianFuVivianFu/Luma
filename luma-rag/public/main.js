// 🎤 语音聊天主模块
class VoiceChatApp {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.userId = "user-" + Math.random().toString(36).substr(2, 9);
        this.useOpenAI = false; // 默认使用Together.ai Llama
        
        this.initSpeechRecognition();
        this.initEventListeners();
        this.loadWelcomeMessage();
    }

    // 初始化语音识别
    initSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            this.recognition.lang = 'en-US';
            this.recognition.interimResults = false;
            this.recognition.continuous = false;
            this.recognition.maxAlternatives = 1;

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                const confidence = event.results[0][0].confidence;
                
                console.log(`🎤 Transcript: "${transcript}" (${(confidence * 100).toFixed(1)}%)`);
                this.handleUserSpeech(transcript, confidence);
            };

            this.recognition.onerror = (event) => {
                console.error('🚨 Speech recognition error:', event.error);
                this.updateMicButton(false);
                this.showError(`Speech recognition error: ${event.error}`);
            };

            this.recognition.onend = () => {
                this.updateMicButton(false);
            };

            console.log('✅ Speech recognition initialized');
        } else {
            console.error('❌ Speech recognition not supported');
            this.showError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
        }
    }

    // 初始化事件监听器
    initEventListeners() {
        // 麦克风按钮
        document.getElementById('micBtn').onclick = () => {
            this.toggleListening();
        };

        // 发送按钮
        document.getElementById('sendBtn').onclick = () => {
            this.sendTextMessage();
        };

        // 文本输入框回车
        document.getElementById('textInput').onkeypress = (e) => {
            if (e.key === 'Enter') {
                this.sendTextMessage();
            }
        };

        // 重置按钮
        document.getElementById('resetBtn').onclick = () => {
            this.resetConversation();
        };

        // 模型切换
        document.getElementById('modelToggle').onchange = (e) => {
            this.useOpenAI = e.target.checked;
            console.log(`🔄 Switched to: ${this.useOpenAI ? 'OpenAI GPT-4' : 'Together.ai Llama'}`);
        };
    }

    // 切换语音监听状态
    toggleListening() {
        if (!this.recognition) {
            this.showError('Speech recognition not available');
            return;
        }

        if (this.isListening) {
            this.recognition.stop();
        } else {
            try {
                this.recognition.start();
                this.updateMicButton(true);
                console.log('🎤 Listening started...');
            } catch (error) {
                console.error('Failed to start recognition:', error);
                this.showError('Failed to start speech recognition');
            }
        }
    }

    // 更新麦克风按钮状态
    updateMicButton(listening) {
        const btn = document.getElementById('micBtn');
        const icon = btn.querySelector('i');
        
        if (listening) {
            this.isListening = true;
            btn.classList.add('listening');
            icon.className = 'fas fa-stop';
            btn.title = 'Stop listening';
        } else {
            this.isListening = false;
            btn.classList.remove('listening');
            icon.className = 'fas fa-microphone';
            btn.title = 'Start voice input';
        }
    }

    // 处理用户语音输入
    async handleUserSpeech(transcript, confidence) {
        // 显示识别质量
        const qualityIndicator = confidence > 0.8 ? '✅' : confidence > 0.6 ? '⚠️' : '❌';
        this.displayMessage('system', `${qualityIndicator} Recognition: ${(confidence * 100).toFixed(1)}%`);
        
        // 显示用户消息
        this.displayMessage('user', transcript);
        
        // 发送到后端并获取回复
        await this.sendToBackend(transcript);
    }

    // 发送文本消息
    async sendTextMessage() {
        const input = document.getElementById('textInput');
        const text = input.value.trim();
        
        if (!text) return;
        
        input.value = '';
        this.displayMessage('user', text);
        await this.sendToBackend(text);
    }

    // 发送消息到后端
    async sendToBackend(text) {
        try {
            this.showTyping(true);
            
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: this.userId,
                    message: text,
                    use_openai: this.useOpenAI
                })
            });

            this.showTyping(false);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            // 显示Luma回复
            this.displayMessage('luma', data.reply);
            
            // 语音朗读回复
            this.speak(data.reply);
            
            // 显示模型信息
            this.displayMessage('system', `💬 ${data.model_used} • Memory: ${data.memory_turns} turns`);
            
            console.log(`💬 Luma replied using ${data.model_used}`);

        } catch (error) {
            this.showTyping(false);
            console.error('❌ Backend error:', error);
            this.showError(`Connection error: ${error.message}`);
        }
    }

    // 语音合成 - 支持ElevenLabs和浏览器内置
    async speak(text) {
        try {
            // 首先尝试使用ElevenLabs API
            const elevenLabsResponse = await this.speakWithElevenLabs(text);
            if (elevenLabsResponse) {
                return;
            }
        } catch (error) {
            console.warn('⚠️ ElevenLabs failed, falling back to browser TTS:', error);
        }

        // 回退到浏览器内置语音合成
        if ('speechSynthesis' in window) {
            // 停止当前播放
            speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.pitch = 1;
            utterance.rate = 0.9;
            utterance.volume = 0.8;
            
            utterance.onstart = () => console.log('🔊 Speaking started');
            utterance.onend = () => console.log('🔊 Speaking ended');
            utterance.onerror = (e) => console.error('🚨 Speech synthesis error:', e);
            
            speechSynthesis.speak(utterance);
        } else {
            console.warn('⚠️ Speech synthesis not supported');
        }
    }

    // ElevenLabs语音合成
    async speakWithElevenLabs(text) {
        try {
            // 注意：ElevenLabs API密钥需要在.env文件中设置
            // ELEVENLABS_API_KEY=your_api_key_here
            // ELEVENLABS_VOICE_ID=your_voice_id_here
            
            const response = await fetch('/api/elevenlabs-tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    text: text,
                    // API密钥和语音ID将在后端从.env文件读取
                })
            });

            if (!response.ok) {
                throw new Error(`ElevenLabs API error: ${response.status}`);
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            
            audio.onplay = () => console.log('🔊 ElevenLabs audio started');
            audio.onended = () => {
                console.log('🔊 ElevenLabs audio ended');
                URL.revokeObjectURL(audioUrl);
            };
            audio.onerror = (e) => console.error('🚨 ElevenLabs audio error:', e);
            
            await audio.play();
            return true;
            
        } catch (error) {
            console.error('❌ ElevenLabs TTS error:', error);
            return false;
        }
    }

    // 显示消息
    displayMessage(sender, text) {
        const chatBox = document.getElementById('chatBox');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        if (sender === 'luma') {
            messageDiv.innerHTML = `
                <div class="avatar luma-avatar"></div>
                <div class="content">
                    <div class="name">Luma</div>
                    <div class="text">${text}</div>
                </div>
            `;
        } else if (sender === 'user') {
            messageDiv.innerHTML = `
                <div class="content">
                    <div class="name">You</div>
                    <div class="text">${text}</div>
                </div>
                <div class="avatar">👤</div>
            `;
        } else {
            messageDiv.innerHTML = `<div class="system-text">${text}</div>`;
        }
        
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // 显示输入状态
    showTyping(show) {
        const indicator = document.getElementById('typingIndicator');
        indicator.style.display = show ? 'block' : 'none';
    }

    // 显示错误
    showError(message) {
        this.displayMessage('system', `❌ ${message}`);
    }

    // 加载欢迎消息
    async loadWelcomeMessage() {
        console.log('🎉 Loading welcome message...');
        const welcomeMessage = "Hi, I'm really glad you're here today. I'm not a therapist—but think of me as a caring friend who loves deep conversations and being there for others. Wherever you are on your journey, I'm here to hold space for you—with warmth, presence, and gentle support.";
        
        setTimeout(() => {
            console.log('📨 Displaying welcome message');
            this.displayMessage('luma', welcomeMessage);
            this.speak(welcomeMessage);
        }, 1000);
    }

    // 重置对话
    async resetConversation() {
        try {
            await fetch('/reset_memory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: this.userId })
            });
            
            document.getElementById('chatBox').innerHTML = '';
            this.displayMessage('system', '🔄 Conversation reset');
            this.loadWelcomeMessage();
            
        } catch (error) {
            console.error('Reset error:', error);
            this.showError('Failed to reset conversation');
        }
    }

    // 初始化视频控制
    initVideoControls() {
        const video = document.getElementById('videoElement');
        const playBtn = document.getElementById('videoPlayBtn');
        const muteBtn = document.getElementById('videoMuteBtn');
        const placeholder = document.getElementById('videoPlaceholder');

        // 视频加载失败时显示占位符
        video.onerror = () => {
            video.style.display = 'none';
            placeholder.style.display = 'flex';
        };

        // 视频加载成功时隐藏占位符
        video.onloadeddata = () => {
            video.style.display = 'block';
            placeholder.style.display = 'none';
        };

        // 播放/暂停控制
        playBtn.addEventListener('click', () => {
            if (video.paused) {
                video.play();
                playBtn.querySelector('i').className = 'fas fa-pause';
            } else {
                video.pause();
                playBtn.querySelector('i').className = 'fas fa-play';
            }
        });

        // 静音控制
        muteBtn.addEventListener('click', () => {
            video.muted = !video.muted;
            muteBtn.querySelector('i').className = video.muted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
        });
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Voice Chat App...');
    window.voiceChatApp = new VoiceChatApp();
    window.voiceChatApp.initVideoControls();
});
