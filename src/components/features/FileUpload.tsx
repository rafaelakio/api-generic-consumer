'use client';

import { useState, useCallback } from 'react';
import { Upload, X, File, Image, FileText, AlertCircle } from 'lucide-react';
import type { RequestFile } from '@/types';

interface FileUploadProps {
  files: RequestFile[];
  onFilesChange: (files: RequestFile[]) => void;
  maxFiles?: number;
  maxSize?: number; // em bytes (default: 10MB)
  acceptedTypes?: string[];
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_ACCEPTED_TYPES = ['*/*'];

export function FileUpload({ 
  files, 
  onFilesChange, 
  maxFiles = 10,
  maxSize = DEFAULT_MAX_SIZE,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const validateFile = useCallback((file: File): string | null => {
    // Validar tamanho
    if (file.size > maxSize) {
      return `Arquivo "${file.name}" excede o tamanho máximo de ${formatFileSize(maxSize)}`;
    }

    // Validar tipo
    if (acceptedTypes.length > 0 && !acceptedTypes.includes('*/*')) {
      const isAccepted = acceptedTypes.some(type => {
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.slice(0, -2));
        }
        return file.type === type;
      });

      if (!isAccepted) {
        return `Arquivo "${file.name}" (${file.type}) não é um tipo aceito`;
      }
    }

    return null;
  }, [maxSize, acceptedTypes]);

  const processFiles = useCallback(async (fileList: FileList) => {
    const newFiles: RequestFile[] = [];
    const newErrors: string[] = [];

    // Verificar limite de arquivos
    if (files.length + fileList.length > maxFiles) {
      newErrors.push(`Máximo de ${maxFiles} arquivos permitidos`);
      setErrors(newErrors);
      return;
    }

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      
      // Validar arquivo
      const validationError = validateFile(file);
      if (validationError) {
        newErrors.push(validationError);
        continue;
      }

      // Converter para base64
      try {
        const content = await fileToBase64(file);
        const requestFile: RequestFile = {
          id: `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          content,
          fieldName: 'file'
        };
        newFiles.push(requestFile);
      } catch (error) {
        newErrors.push(`Erro ao processar arquivo "${file.name}"`);
      }
    }

    setErrors(newErrors);
    if (newFiles.length > 0) {
      onFilesChange([...files, ...newFiles]);
    }
  }, [files, maxFiles, validateFile, onFilesChange]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remover o prefixo "data:*/*;base64,"
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  }, [processFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      processFiles(selectedFiles);
    }
    // Limpar o input para permitir selecionar o mesmo arquivo novamente
    e.target.value = '';
  }, [processFiles]);

  const removeFile = useCallback((fileId: string) => {
    onFilesChange(files.filter(f => f.id !== fileId));
  }, [files, onFilesChange]);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <Image className="w-4 h-4 text-green-500" />;
    } else if (type.startsWith('text/')) {
      return <FileText className="w-4 h-4 text-blue-500" />;
    } else {
      return <File className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Área de Upload */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
          ${isDragOver 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p className="text-sm font-medium text-gray-700 mb-1">
          Arraste arquivos aqui ou clique para selecionar
        </p>
        <p className="text-xs text-gray-500">
          Máximo {maxFiles} arquivos • {formatFileSize(maxSize)} por arquivo
        </p>
        {acceptedTypes.length > 0 && !acceptedTypes.includes('*/*') && (
          <p className="text-xs text-gray-400 mt-1">
            Tipos aceitos: {acceptedTypes.join(', ')}
          </p>
        )}
      </div>

      {/* Erros */}
      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((error, index) => (
            <div key={index} className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* Lista de Arquivos */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            Arquivos ({files.length})
          </h4>
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg"
              >
                {getFileIcon(file.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)} • {file.type || 'Tipo desconhecido'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}