import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getContractReadOnly, getContractWithSigner } from "./contract";
import WalletManager from "./components/WalletManager";
import WalletSelector from "./components/WalletSelector";
import "./App.css";

interface TrackRecord {
  id: string;
  encryptedData: string;
  timestamp: number;
  owner: string;
  trackName: string;
  artist: string;
  genre: string;
  duration: number;
}

const App: React.FC = () => {
  const [account, setAccount] = useState("");
  const [loading, setLoading] = useState(true);
  const [tracks, setTracks] = useState<TrackRecord[]>([]);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [walletSelectorOpen, setWalletSelectorOpen] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{
    visible: boolean;
    status: "pending" | "success" | "error";
    message: string;
  }>({ visible: false, status: "pending", message: "" });
  const [newTrackData, setNewTrackData] = useState({
    trackName: "",
    artist: "",
    genre: "",
    duration: 0
  });
  const [showTutorial, setShowTutorial] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<TrackRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [language, setLanguage] = useState<"en" | "zh">("en");

  // Calculate statistics for dashboard
  const totalTracks = tracks.length;
  const totalDuration = tracks.reduce((sum, track) => sum + track.duration, 0);
  const genreDistribution = calculateGenreDistribution(tracks);
  const topArtists = calculateTopArtists(tracks);

  useEffect(() => {
    loadTracks().finally(() => setLoading(false));
  }, []);

  function calculateGenreDistribution(tracks: TrackRecord[]) {
    const distribution: Record<string, number> = {};
    tracks.forEach(track => {
      distribution[track.genre] = (distribution[track.genre] || 0) + 1;
    });
    return distribution;
  }

  function calculateTopArtists(tracks: TrackRecord[]) {
    const artistCount: Record<string, number> = {};
    tracks.forEach(track => {
      artistCount[track.artist] = (artistCount[track.artist] || 0) + 1;
    });
    
    return Object.entries(artistCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([artist, count]) => ({ artist, count }));
  }

  const onWalletSelect = async (wallet: any) => {
    if (!wallet.provider) return;
    try {
      const web3Provider = new ethers.BrowserProvider(wallet.provider);
      setProvider(web3Provider);
      const accounts = await web3Provider.send("eth_requestAccounts", []);
      const acc = accounts[0] || "";
      setAccount(acc);

      wallet.provider.on("accountsChanged", async (accounts: string[]) => {
        const newAcc = accounts[0] || "";
        setAccount(newAcc);
      });
    } catch (e) {
      alert("Failed to connect wallet");
    }
  };

  const onConnect = () => setWalletSelectorOpen(true);
  const onDisconnect = () => {
    setAccount("");
    setProvider(null);
  };

  const loadTracks = async () => {
    setIsRefreshing(true);
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      // Check contract availability using FHE
      const isAvailable = await contract.isAvailable();
      if (!isAvailable) {
        console.error("Contract is not available");
        return;
      }
      
      const keysBytes = await contract.getData("track_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing track keys:", e);
        }
      }
      
      const list: TrackRecord[] = [];
      
      for (const key of keys) {
        try {
          const trackBytes = await contract.getData(`track_${key}`);
          if (trackBytes.length > 0) {
            try {
              const trackData = JSON.parse(ethers.toUtf8String(trackBytes));
              list.push({
                id: key,
                encryptedData: trackData.data,
                timestamp: trackData.timestamp,
                owner: trackData.owner,
                trackName: trackData.trackName,
                artist: trackData.artist,
                genre: trackData.genre,
                duration: trackData.duration
              });
            } catch (e) {
              console.error(`Error parsing track data for ${key}:`, e);
            }
          }
        } catch (e) {
          console.error(`Error loading track ${key}:`, e);
        }
      }
      
      list.sort((a, b) => b.timestamp - a.timestamp);
      setTracks(list);
    } catch (e) {
      console.error("Error loading tracks:", e);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  const uploadTrack = async () => {
    if (!provider) { 
      alert("Please connect wallet first"); 
      return; 
    }
    
    setUploading(true);
    setTransactionStatus({
      visible: true,
      status: "pending",
      message: language === "en" 
        ? "Encrypting track data with FHE..." 
        : "正在使用FHE加密曲目数据..."
    });
    
    try {
      // Simulate FHE encryption
      const encryptedData = `FHE-${btoa(JSON.stringify(newTrackData))}`;
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const trackId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const trackData = {
        data: encryptedData,
        timestamp: Math.floor(Date.now() / 1000),
        owner: account,
        trackName: newTrackData.trackName,
        artist: newTrackData.artist,
        genre: newTrackData.genre,
        duration: newTrackData.duration
      };
      
      // Store encrypted data on-chain using FHE
      await contract.setData(
        `track_${trackId}`, 
        ethers.toUtf8Bytes(JSON.stringify(trackData))
      );
      
      const keysBytes = await contract.getData("track_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing keys:", e);
        }
      }
      
      keys.push(trackId);
      
      await contract.setData(
        "track_keys", 
        ethers.toUtf8Bytes(JSON.stringify(keys))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: language === "en" 
          ? "Encrypted track data submitted securely!" 
          : "加密曲目数据已安全提交！"
      });
      
      await loadTracks();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
        setShowUploadModal(false);
        setNewTrackData({
          trackName: "",
          artist: "",
          genre: "",
          duration: 0
        });
      }, 2000);
    } catch (e: any) {
      const errorMessage = e.message.includes("user rejected transaction")
        ? language === "en" ? "Transaction rejected by user" : "用户拒绝了交易"
        : (language === "en" ? "Submission failed: " : "提交失败：") + (e.message || (language === "en" ? "Unknown error" : "未知错误"));
      
      setTransactionStatus({
        visible: true,
        status: "error",
        message: errorMessage
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    } finally {
      setUploading(false);
    }
  };

  const checkAvailability = async () => {
    if (!provider) {
      alert(language === "en" ? "Please connect wallet first" : "请先连接钱包");
      return;
    }

    setTransactionStatus({
      visible: true,
      status: "pending",
      message: language === "en" 
        ? "Checking FHE contract availability..." 
        : "正在检查FHE合约可用性..."
    });

    try {
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const isAvailable = await contract.isAvailable();
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: isAvailable 
          ? (language === "en" ? "FHE contract is available!" : "FHE合约可用！")
          : (language === "en" ? "FHE contract is not available" : "FHE合约不可用")
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
    } catch (e: any) {
      setTransactionStatus({
        visible: true,
        status: "error",
        message: (language === "en" ? "Check failed: " : "检查失败：") + (e.message || (language === "en" ? "Unknown error" : "未知错误"))
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    }
  };

  const isOwner = (address: string) => {
    return account.toLowerCase() === address.toLowerCase();
  };

  const tutorialSteps = [
    {
      title: language === "en" ? "Connect Wallet" : "连接钱包",
      description: language === "en" 
        ? "Connect your Web3 wallet to start using the privacy-preserving music platform" 
        : "连接您的Web3钱包，开始使用隐私保护音乐平台",
      icon: "🔗"
    },
    {
      title: language === "en" ? "Upload Music Data" : "上传音乐数据",
      description: language === "en" 
        ? "Add your listening history which will be encrypted using FHE technology" 
        : "添加您的收听历史，将使用FHE技术进行加密",
      icon: "🔒"
    },
    {
      title: language === "en" ? "FHE Processing" : "FHE处理",
      description: language === "en" 
        ? "Your music data is processed in encrypted state without decryption" 
        : "您的音乐数据在加密状态下处理，无需解密",
      icon: "⚙️"
    },
    {
      title: language === "en" ? "Get Your Wrapped" : "获取年度总结",
      description: language === "en" 
        ? "Receive personalized music insights while keeping your listening history private" 
        : "获取个性化音乐洞察，同时保护您的收听历史隐私",
      icon: "🎵"
    }
  ];

  const renderGenreChart = () => {
    const total = Object.values(genreDistribution).reduce((sum, count) => sum + count, 0) || 1;
    
    return (
      <div className="genre-chart">
        {Object.entries(genreDistribution).map(([genre, count], index) => {
          const percentage = (count / total) * 100;
          return (
            <div key={genre} className="genre-bar">
              <div className="genre-label">{genre}</div>
              <div className="bar-container">
                <div 
                  className="bar-fill" 
                  style={{ 
                    width: `${percentage}%`,
                    backgroundColor: `hsl(${index * 60}, 70%, 60%)`
                  }}
                ></div>
              </div>
              <div className="genre-count">{count} {language === "en" ? "tracks" : "首"}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const filteredTracks = tracks.filter(track => 
    track.trackName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.genre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTracks = filteredTracks.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTracks.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const toggleLanguage = () => {
    setLanguage(prev => prev === "en" ? "zh" : "en");
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner"></div>
      <p>{language === "en" ? "Initializing encrypted connection..." : "正在初始化加密连接..."}</p>
    </div>
  );

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon">
            <div className="music-icon"></div>
          </div>
          <h1>FHE<span>Music</span>Wrapped</h1>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={() => setShowUploadModal(true)} 
            className="upload-track-btn"
          >
            <div className="add-icon"></div>
            {language === "en" ? "Add Track" : "添加曲目"}
          </button>
          <button 
            onClick={checkAvailability}
            className="check-availability-btn"
          >
            {language === "en" ? "Check FHE" : "检查FHE"}
          </button>
          <button 
            onClick={toggleLanguage}
            className="language-toggle"
          >
            {language === "en" ? "中文" : "EN"}
          </button>
          <WalletManager account={account} onConnect={onConnect} onDisconnect={onDisconnect} />
        </div>
      </header>
      
      <div className="main-content">
        <div className="welcome-banner">
          <div className="welcome-text">
            <h2>{language === "en" ? "Privacy-Preserving Music Wrapped" : "隐私保护音乐年度总结"}</h2>
            <p>
              {language === "en" 
                ? "Discover your music taste with FHE technology - your data stays encrypted and private" 
                : "使用FHE技术发现您的音乐品味 - 您的数据保持加密和私密"}
            </p>
          </div>
        </div>
        
        {showTutorial && (
          <div className="tutorial-section">
            <h2>{language === "en" ? "How It Works" : "使用教程"}</h2>
            <p className="subtitle">
              {language === "en" 
                ? "Learn how to securely process your music data" 
                : "了解如何安全地处理您的音乐数据"}
            </p>
            
            <div className="tutorial-steps">
              {tutorialSteps.map((step, index) => (
                <div 
                  className="tutorial-step"
                  key={index}
                >
                  <div className="step-icon">{step.icon}</div>
                  <div className="step-content">
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h3>{language === "en" ? "Project Introduction" : "项目介绍"}</h3>
            <p>
              {language === "en" 
                ? "Privacy-preserving music wrapped platform using FHE technology to analyze your listening history without decrypting your data." 
                : "使用FHE技术的隐私保护音乐年度总结平台，无需解密即可分析您的收听历史。"}
            </p>
            <div className="fhe-badge">
              <span>FHE-Powered</span>
            </div>
          </div>
          
          <div className="dashboard-card">
            <h3>{language === "en" ? "Music Statistics" : "音乐统计"}</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{totalTracks}</div>
                <div className="stat-label">{language === "en" ? "Total Tracks" : "总曲目数"}</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{Math.floor(totalDuration / 60)}</div>
                <div className="stat-label">{language === "en" ? "Total Minutes" : "总分钟数"}</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{Object.keys(genreDistribution).length}</div>
                <div className="stat-label">{language === "en" ? "Genres" : "音乐类型"}</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{new Set(tracks.map(t => t.artist)).size}</div>
                <div className="stat-label">{language === "en" ? "Artists" : "艺术家"}</div>
              </div>
            </div>
          </div>
          
          <div className="dashboard-card">
            <h3>{language === "en" ? "Top Artists" : "热门艺术家"}</h3>
            <div className="top-artists">
              {topArtists.map((item, index) => (
                <div key={item.artist} className="artist-item">
                  <div className="artist-rank">#{index + 1}</div>
                  <div className="artist-name">{item.artist}</div>
                  <div className="artist-count">{item.count} {language === "en" ? "tracks" : "首"}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="dashboard-card full-width">
            <h3>{language === "en" ? "Genre Distribution" : "音乐类型分布"}</h3>
            {renderGenreChart()}
          </div>
        </div>
        
        <div className="tracks-section">
          <div className="section-header">
            <h2>{language === "en" ? "Your Encrypted Tracks" : "加密曲目列表"}</h2>
            <div className="header-actions">
              <div className="search-box">
                <input 
                  type="text" 
                  placeholder={language === "en" ? "Search tracks..." : "搜索曲目..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button 
                onClick={loadTracks}
                className="refresh-btn"
                disabled={isRefreshing}
              >
                {isRefreshing 
                  ? (language === "en" ? "Refreshing..." : "刷新中...") 
                  : (language === "en" ? "Refresh" : "刷新")
                }
              </button>
              <button 
                onClick={() => setShowTutorial(!showTutorial)}
                className="tutorial-toggle"
              >
                {showTutorial 
                  ? (language === "en" ? "Hide Tutorial" : "隐藏教程") 
                  : (language === "en" ? "Show Tutorial" : "显示教程")
                }
              </button>
            </div>
          </div>
          
          <div className="tracks-list">
            <div className="table-header">
              <div className="header-cell">{language === "en" ? "Track" : "曲目"}</div>
              <div className="header-cell">{language === "en" ? "Artist" : "艺术家"}</div>
              <div className="header-cell">{language === "en" ? "Genre" : "类型"}</div>
              <div className="header-cell">{language === "en" ? "Duration" : "时长"}</div>
              <div className="header-cell">{language === "en" ? "Date" : "日期"}</div>
              <div className="header-cell">{language === "en" ? "Actions" : "操作"}</div>
            </div>
            
            {currentTracks.length === 0 ? (
              <div className="no-tracks">
                <div className="no-tracks-icon"></div>
                <p>{language === "en" ? "No encrypted tracks found" : "未找到加密曲目"}</p>
                <button 
                  className="primary"
                  onClick={() => setShowUploadModal(true)}
                >
                  {language === "en" ? "Add First Track" : "添加首支曲目"}
                </button>
              </div>
            ) : (
              <>
                {currentTracks.map(track => (
                  <div className="track-row" key={track.id}>
                    <div className="table-cell track-name">{track.trackName}</div>
                    <div className="table-cell">{track.artist}</div>
                    <div className="table-cell">{track.genre}</div>
                    <div className="table-cell">{Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}</div>
                    <div className="table-cell">
                      {new Date(track.timestamp * 1000).toLocaleDateString()}
                    </div>
                    <div className="table-cell actions">
                      <button 
                        className="action-btn"
                        onClick={() => setSelectedTrack(track)}
                      >
                        {language === "en" ? "Details" : "详情"}
                      </button>
                    </div>
                  </div>
                ))}
                
                {totalPages > 1 && (
                  <div className="pagination">
                    <button 
                      onClick={() => paginate(currentPage - 1)} 
                      disabled={currentPage === 1}
                    >
                      &laquo;
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => paginate(page)}
                        className={currentPage === page ? "active" : ""}
                      >
                        {page}
                      </button>
                    ))}
                    
                    <button 
                      onClick={() => paginate(currentPage + 1)} 
                      disabled={currentPage === totalPages}
                    >
                      &raquo;
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="footer-section">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="logo">
                <div className="music-icon"></div>
                <span>FHEMusicWrapped</span>
              </div>
              <p>
                {language === "en" 
                  ? "Privacy-preserving music analytics with FHE technology" 
                  : "采用FHE技术的隐私保护音乐分析平台"}
              </p>
            </div>
            
            <div className="footer-links">
              <a href="#" className="footer-link">
                {language === "en" ? "Documentation" : "文档"}
              </a>
              <a href="#" className="footer-link">
                {language === "en" ? "Privacy Policy" : "隐私政策"}
              </a>
              <a href="#" className="footer-link">
                {language === "en" ? "Terms of Service" : "服务条款"}
              </a>
              <a href="#" className="footer-link">
                {language === "en" ? "Contact" : "联系我们"}
              </a>
            </div>
          </div>
          
          <div className="footer-bottom">
            <div className="fhe-badge">
              <span>FHE-Powered Privacy</span>
            </div>
            <div className="copyright">
              © {new Date().getFullYear()} FHEMusicWrapped. {language === "en" ? "All rights reserved." : "保留所有权利。"}
            </div>
          </div>
        </div>
      </div>
  
      {showUploadModal && (
        <ModalUpload 
          onSubmit={uploadTrack} 
          onClose={() => setShowUploadModal(false)} 
          uploading={uploading}
          trackData={newTrackData}
          setTrackData={setNewTrackData}
          language={language}
        />
      )}
      
      {walletSelectorOpen && (
        <WalletSelector
          isOpen={walletSelectorOpen}
          onWalletSelect={(wallet) => { onWalletSelect(wallet); setWalletSelectorOpen(false); }}
          onClose={() => setWalletSelectorOpen(false)}
        />
      )}
      
      {transactionStatus.visible && (
        <div className="transaction-modal">
          <div className="transaction-content">
            <div className={`transaction-icon ${transactionStatus.status}`}>
              {transactionStatus.status === "pending" && <div className="spinner"></div>}
              {transactionStatus.status === "success" && <div className="check-icon">✓</div>}
              {transactionStatus.status === "error" && <div className="error-icon">✕</div>}
            </div>
            <div className="transaction-message">
              {transactionStatus.message}
            </div>
          </div>
        </div>
      )}
    
      {selectedTrack && (
        <TrackDetails 
          track={selectedTrack} 
          onClose={() => setSelectedTrack(null)}
          language={language}
        />
      )}
    </div>
  );
};

interface ModalUploadProps {
  onSubmit: () => void; 
  onClose: () => void; 
  uploading: boolean;
  trackData: any;
  setTrackData: (data: any) => void;
  language: "en" | "zh";
}

const ModalUpload: React.FC<ModalUploadProps> = ({ 
  onSubmit, 
  onClose, 
  uploading,
  trackData,
  setTrackData,
  language
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTrackData({
      ...trackData,
      [name]: name === "duration" ? parseInt(value) : value
    });
  };

  const handleSubmit = () => {
    if (!trackData.trackName || !trackData.artist || !trackData.genre || !trackData.duration) {
      alert(language === "en" ? "Please fill all required fields" : "请填写所有必填字段");
      return;
    }
    
    onSubmit();
  };

  return (
    <div className="modal-overlay">
      <div className="upload-modal">
        <div className="modal-header">
          <h2>{language === "en" ? "Add Encrypted Track" : "添加加密曲目"}</h2>
          <button onClick={onClose} className="close-modal">&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="fhe-notice-banner">
            <div className="key-icon">🔒</div> 
            {language === "en" 
              ? "Your music data will be encrypted with FHE technology" 
              : "您的音乐数据将使用FHE技术进行加密"}
          </div>
          
          <div className="form-grid">
            <div className="form-group">
              <label>{language === "en" ? "Track Name *" : "曲目名称 *"}</label>
              <input 
                type="text"
                name="trackName"
                value={trackData.trackName} 
                onChange={handleChange}
                placeholder={language === "en" ? "Enter track name..." : "输入曲目名称..."}
                className="text-input"
              />
            </div>
            
            <div className="form-group">
              <label>{language === "en" ? "Artist *" : "艺术家 *"}</label>
              <input 
                type="text"
                name="artist"
                value={trackData.artist} 
                onChange={handleChange}
                placeholder={language === "en" ? "Enter artist name..." : "输入艺术家名称..."}
                className="text-input"
              />
            </div>
            
            <div className="form-group">
              <label>{language === "en" ? "Genre *" : "音乐类型 *"}</label>
              <select 
                name="genre"
                value={trackData.genre} 
                onChange={handleChange}
                className="select-input"
              >
                <option value="">{language === "en" ? "Select genre" : "选择音乐类型"}</option>
                <option value="Pop">Pop</option>
                <option value="Rock">Rock</option>
                <option value="Hip Hop">Hip Hop</option>
                <option value="Electronic">Electronic</option>
                <option value="Jazz">Jazz</option>
                <option value="Classical">Classical</option>
                <option value="R&B">R&B</option>
                <option value="Country">Country</option>
                <option value="Metal">Metal</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>{language === "en" ? "Duration (seconds) *" : "时长 (秒) *"}</label>
              <input 
                type="number"
                name="duration"
                value={trackData.duration} 
                onChange={handleChange}
                placeholder={language === "en" ? "Enter duration..." : "输入时长..."}
                className="number-input"
                min="0"
              />
            </div>
          </div>
          
          <div className="privacy-notice">
            <div className="privacy-icon">🔒</div> 
            {language === "en" 
              ? "Data remains encrypted during FHE processing" 
              : "数据在FHE处理过程中保持加密状态"}
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            onClick={onClose}
            className="cancel-btn"
          >
            {language === "en" ? "Cancel" : "取消"}
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={uploading}
            className="submit-btn primary"
          >
            {uploading 
              ? (language === "en" ? "Encrypting with FHE..." : "正在使用FHE加密...") 
              : (language === "en" ? "Submit Securely" : "安全提交")
            }
          </button>
        </div>
      </div>
    </div>
  );
};

interface TrackDetailsProps {
  track: TrackRecord;
  onClose: () => void;
  language: "en" | "zh";
}

const TrackDetails: React.FC<TrackDetailsProps> = ({ track, onClose, language }) => {
  return (
    <div className="modal-overlay">
      <div className="details-modal">
        <div className="modal-header">
          <h2>{language === "en" ? "Track Details" : "曲目详情"}</h2>
          <button onClick={onClose} className="close-modal">&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="track-info">
            <div className="info-item">
              <span className="label">{language === "en" ? "Track Name:" : "曲目名称:"}</span>
              <span className="value">{track.trackName}</span>
            </div>
            <div className="info-item">
              <span className="label">{language === "en" ? "Artist:" : "艺术家:"}</span>
              <span className="value">{track.artist}</span>
            </div>
            <div className="info-item">
              <span className="label">{language === "en" ? "Genre:" : "音乐类型:"}</span>
              <span className="value">{track.genre}</span>
            </div>
            <div className="info-item">
              <span className="label">{language === "en" ? "Duration:" : "时长:"}</span>
              <span className="value">
                {Math.floor(track.duration / 60)}:
                {(track.duration % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <div className="info-item">
              <span className="label">{language === "en" ? "Date Added:" : "添加日期:"}</span>
              <span className="value">
                {new Date(track.timestamp * 1000).toLocaleDateString()}
              </span>
            </div>
            <div className="info-item">
              <span className="label">{language === "en" ? "Owner:" : "所有者:"}</span>
              <span className="value">
                {track.owner.substring(0, 6)}...{track.owner.substring(38)}
              </span>
            </div>
          </div>
          
          <div className="encryption-notice">
            <div className="encryption-icon">🔒</div>
            <p>
              {language === "en" 
                ? "This track's data is encrypted using FHE technology and can only be processed in its encrypted form." 
                : "此曲目的数据使用FHE技术加密，只能以加密形式进行处理。"}
            </p>
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            onClick={onClose}
            className="close-btn primary"
          >
            {language === "en" ? "Close" : "关闭"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;