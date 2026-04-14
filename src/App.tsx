import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Upload, 
  Download, 
  Key, 
  File as FileIcon, 
  Copy, 
  Lock, 
  Unlock,
  RefreshCw,
  AlertCircle,
  Share2,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast, Toaster } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  generateAESKey, 
  exportKey, 
  importKey, 
  encryptFile, 
  decryptFile 
} from '@/src/lib/cryptoUtils';

export default function App() {
  const [activeTab, setActiveTab] = useState('send');
  const [file, setFile] = useState<File | null>(null);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [transferLink, setTransferLink] = useState('');
  const [downloadId, setDownloadId] = useState('');
  const [downloadKey, setDownloadKey] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedFile, setDecryptedFile] = useState<{ blob: Blob, name: string } | null>(null);
  const [downloadInfo, setDownloadInfo] = useState<{ name: string, size: number } | null>(null);

  // Handle hash changes for direct download links
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/download/')) {
        const parts = hash.replace('#/download/', '').split('#');
        if (parts.length === 2) {
          setDownloadId(parts[0]);
          setDownloadKey(parts[1]);
          setActiveTab('receive');
          fetchFileInfo(parts[0]);
        }
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const fetchFileInfo = async (id: string) => {
    try {
      const res = await fetch(`/api/file/${id}/info`);
      if (res.ok) {
        const data = await res.json();
        setDownloadInfo({ name: data.originalName, size: data.size });
      } else {
        toast.error('File not found or expired');
      }
    } catch (err) {
      toast.error('Failed to fetch file info');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setIsEncrypting(true);
      toast.info('Generating secure key and encrypting...');
      
      const aesKey = await generateAESKey();
      const exportedKey = await exportKey(aesKey);
      const encryptedBlob = await encryptFile(file, aesKey);

      setIsEncrypting(false);
      setIsUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('file', encryptedBlob, file.name);
      formData.append('name', file.name);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload', true);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          const link = `${window.location.origin}${window.location.pathname}#/download/${data.id}#${exportedKey}`;
          setTransferLink(link);
          toast.success('File uploaded and encrypted successfully!');
        } else {
          toast.error('Upload failed');
        }
        setIsUploading(false);
      };

      xhr.onerror = () => {
        toast.error('Network error during upload');
        setIsUploading(false);
      };

      xhr.send(formData);
    } catch (err) {
      console.error(err);
      toast.error('Encryption failed');
      setIsEncrypting(false);
      setIsUploading(false);
    }
  };

  const handleDownloadAndDecrypt = async () => {
    if (!downloadId || !downloadKey) return;

    try {
      setIsDecrypting(true);
      toast.info('Downloading encrypted file...');

      const res = await fetch(`/api/file/${downloadId}/download`);
      if (!res.ok) throw new Error('Download failed');

      const encryptedBuffer = await res.arrayBuffer();
      
      toast.info('Decrypting file...');
      const aesKey = await importKey(downloadKey);
      const decryptedBlob = await decryptFile(encryptedBuffer, aesKey);

      setDecryptedFile({ 
        blob: decryptedBlob, 
        name: downloadInfo?.name.replace('.enc', '') || 'decrypted_file' 
      });
      toast.success('File decrypted successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Decryption failed. Invalid key or corrupted file.');
    } finally {
      setIsDecrypting(false);
    }
  };

  const saveFile = () => {
    if (!decryptedFile) return;
    const url = URL.createObjectURL(decryptedFile.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = decryptedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-zinc-700 selection:text-white">
      <Toaster position="top-center" theme="dark" />
      
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-zinc-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zinc-900/20 rounded-full blur-[120px]" />
      </div>

      <header className="relative z-10 border-b border-zinc-800/50 bg-black/50 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-black" />
            </div>
            <span className="font-bold text-xl tracking-tight">CipherVault</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> AES-256-GCM
            </span>
            <span className="w-1 h-1 bg-zinc-700 rounded-full" />
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> End-to-End Encrypted
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-[1fr_380px] gap-12 items-start">
          
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
                Securely transfer files with <span className="text-zinc-500">military-grade</span> encryption.
              </h1>
              <p className="text-lg text-zinc-400 max-w-xl">
                Your files are encrypted in your browser before they ever touch our servers. 
                Only the recipient with the unique key can unlock them.
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-zinc-900/50 border border-zinc-800 p-1">
                <TabsTrigger value="send" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
                  <Upload className="w-4 h-4 mr-2" /> Send File
                </TabsTrigger>
                <TabsTrigger value="receive" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
                  <Download className="w-4 h-4 mr-2" /> Receive File
                </TabsTrigger>
              </TabsList>

              <div className="mt-8">
                <AnimatePresence mode="wait">
                  {activeTab === 'send' ? (
                    <motion.div
                      key="send"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <Card className="bg-zinc-900/30 border-zinc-800/50 backdrop-blur-sm">
                        <CardHeader>
                          <CardTitle className="text-xl">Upload & Encrypt</CardTitle>
                          <CardDescription className="text-zinc-500">
                            Select a file to encrypt and generate a secure transfer link.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {!transferLink ? (
                            <div 
                              className={`
                                border-2 border-dashed rounded-xl p-12 text-center transition-all
                                ${file ? 'border-zinc-500 bg-zinc-800/20' : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50'}
                              `}
                            >
                              <input
                                type="file"
                                id="file-upload"
                                className="hidden"
                                onChange={handleFileChange}
                                disabled={isUploading || isEncrypting}
                              />
                              <label htmlFor="file-upload" className="cursor-pointer">
                                <div className="flex flex-col items-center gap-4">
                                  <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
                                    {file ? <FileIcon className="w-8 h-8 text-white" /> : <Upload className="w-8 h-8 text-zinc-500" />}
                                  </div>
                                  <div>
                                    <p className="text-lg font-medium text-white">
                                      {file ? file.name : 'Click to select a file'}
                                    </p>
                                    <p className="text-sm text-zinc-500 mt-1">
                                      {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Up to 50MB per transfer'}
                                    </p>
                                  </div>
                                </div>
                              </label>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <Alert className="bg-zinc-900/50 border-zinc-800">
                                <Share2 className="h-4 w-4" />
                                <AlertTitle>Transfer Link Ready</AlertTitle>
                                <AlertDescription className="text-zinc-400">
                                  Share this link with the recipient. The encryption key is included in the link hash and is never sent to our server.
                                </AlertDescription>
                              </Alert>
                              <div className="flex gap-2">
                                <Input 
                                  readOnly 
                                  value={transferLink} 
                                  className="bg-black border-zinc-800 text-zinc-400"
                                />
                                <Button 
                                  variant="secondary" 
                                  onClick={() => copyToClipboard(transferLink)}
                                  className="shrink-0"
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )}

                          {(isEncrypting || isUploading) && (
                            <div className="space-y-3">
                              <div className="flex justify-between text-sm">
                                <span className="text-zinc-400">
                                  {isEncrypting ? 'Encrypting file...' : 'Uploading to vault...'}
                                </span>
                                <span className="text-white font-medium">{uploadProgress}%</span>
                              </div>
                              <Progress value={uploadProgress} className="h-1.5 bg-zinc-800" />
                            </div>
                          )}
                        </CardContent>
                        <CardFooter className="flex justify-between border-t border-zinc-800/50 pt-6">
                          {transferLink ? (
                            <Button variant="outline" onClick={() => { setFile(null); setTransferLink(''); }} className="border-zinc-800 text-zinc-400 hover:text-white">
                              New Transfer
                            </Button>
                          ) : (
                            <>
                              <Button variant="ghost" onClick={() => setFile(null)} disabled={!file || isUploading} className="text-zinc-500">
                                Clear
                              </Button>
                              <Button 
                                onClick={handleUpload} 
                                disabled={!file || isUploading || isEncrypting}
                                className="bg-white text-black hover:bg-zinc-200 px-8"
                              >
                                {isUploading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                                Encrypt & Send
                              </Button>
                            </>
                          )}
                        </CardFooter>
                      </Card>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="receive"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <Card className="bg-zinc-900/30 border-zinc-800/50 backdrop-blur-sm">
                        <CardHeader>
                          <CardTitle className="text-xl">Receive & Decrypt</CardTitle>
                          <CardDescription className="text-zinc-500">
                            Enter the transfer ID and secret key to unlock the file.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div className="grid gap-4">
                            <div className="space-y-2">
                              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Transfer ID</label>
                              <Input 
                                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000" 
                                value={downloadId}
                                onChange={(e) => setDownloadId(e.target.value)}
                                className="bg-black border-zinc-800"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Secret Key</label>
                              <div className="relative">
                                <Input 
                                  type="password"
                                  placeholder="AES Encryption Key" 
                                  value={downloadKey}
                                  onChange={(e) => setDownloadKey(e.target.value)}
                                  className="bg-black border-zinc-800 pr-10"
                                />
                                <Key className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                              </div>
                            </div>
                          </div>

                          {downloadInfo && (
                            <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800 flex items-center gap-4">
                              <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center">
                                <FileIcon className="w-5 h-5 text-zinc-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{downloadInfo.name}</p>
                                <p className="text-xs text-zinc-500">{(downloadInfo.size / 1024 / 1024).toFixed(2)} MB • Encrypted</p>
                              </div>
                            </div>
                          )}

                          {decryptedFile && (
                            <Alert className="bg-green-900/10 border-green-900/30 text-green-400">
                              <Check className="h-4 w-4" />
                              <AlertTitle>Decryption Successful</AlertTitle>
                              <AlertDescription>
                                The file has been successfully decrypted and is ready for download.
                              </AlertDescription>
                            </Alert>
                          )}
                        </CardContent>
                        <CardFooter className="flex justify-end gap-3 border-t border-zinc-800/50 pt-6">
                          {decryptedFile ? (
                            <Button onClick={saveFile} className="bg-green-600 hover:bg-green-500 text-white px-8">
                              <Download className="w-4 h-4 mr-2" /> Download File
                            </Button>
                          ) : (
                            <Button 
                              onClick={handleDownloadAndDecrypt} 
                              disabled={!downloadId || !downloadKey || isDecrypting}
                              className="bg-white text-black hover:bg-zinc-200 px-8"
                            >
                              {isDecrypting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Unlock className="w-4 h-4 mr-2" />}
                              Decrypt & Unlock
                            </Button>
                          )}
                        </CardFooter>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Tabs>
          </div>

          <aside className="space-y-6">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-zinc-500">Security Specs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 p-1.5 bg-zinc-800 rounded">
                    <Shield className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">AES-256-GCM</p>
                    <p className="text-xs text-zinc-500">Authenticated encryption ensuring both confidentiality and integrity.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 p-1.5 bg-zinc-800 rounded">
                    <Lock className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Zero-Knowledge</p>
                    <p className="text-xs text-zinc-500">Keys never leave your browser. We cannot see your data.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 p-1.5 bg-zinc-800 rounded">
                    <RefreshCw className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Auto-Expiration</p>
                    <p className="text-xs text-zinc-500">Files are automatically purged from our vault after 24 hours.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 space-y-4">
              <div className="flex items-center gap-2 text-zinc-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Pro Tip</span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                For maximum security, share the transfer link via an encrypted messaging app like Signal or WhatsApp.
              </p>
            </div>
          </aside>

        </div>
      </main>

      <footer className="mt-auto border-t border-zinc-800/50 py-12">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">CipherVault v1.0</span>
          </div>
          <div className="flex gap-8 text-sm text-zinc-500">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Security Audit</a>
            <a href="#" className="hover:text-white transition-colors">Open Source</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
