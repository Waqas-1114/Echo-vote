'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, X } from 'lucide-react';

export const MAX_PHOTOS = 10;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // backend limit per photo
const MAX_DIMENSION = 1920; // long edge after resizing

/**
 * Shrinks large photos in the browser before upload: phone cameras produce
 * 3–10 MB images, far more than needed as evidence. Small images and formats
 * the browser can't decode are returned unchanged.
 */
async function compressImage(file) {
    if (file.size <= 1024 * 1024 || file.type === 'image/gif') return file;
    try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
        if (!blob || blob.size >= file.size) return file;
        return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
    } catch {
        return file;
    }
}

const formatSize = (bytes) => (bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

/**
 * Photo picker with drag & drop, camera capture on phones, previews and
 * removal. The parent owns the list: `photos` is an array of { file, preview }
 * and `onChange` receives the next array. Upload happens on submit.
 */
export default function PhotoUploader({ photos, onChange, disabled = false, required = false }) {
    const inputRef = useRef(null);
    const cameraRef = useRef(null);
    const [dragging, setDragging] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');

    // Release preview object URLs when photos are removed or the form closes
    const previewsRef = useRef([]);
    useEffect(() => {
        const current = photos.map((photo) => photo.preview);
        previewsRef.current.filter((url) => !current.includes(url)).forEach((url) => URL.revokeObjectURL(url));
        previewsRef.current = current;
    }, [photos]);
    useEffect(() => () => previewsRef.current.forEach((url) => URL.revokeObjectURL(url)), []);

    const addFiles = async (fileList) => {
        const incoming = Array.from(fileList || []);
        if (incoming.length === 0) return;
        setError('');

        const images = incoming.filter((file) => file.type.startsWith('image/'));
        const problems = [];
        if (images.length < incoming.length) problems.push('Only image files can be added.');

        const room = MAX_PHOTOS - photos.length;
        if (images.length > room) problems.push(`You can attach up to ${MAX_PHOTOS} photos.`);

        setProcessing(true);
        const added = [];
        for (const file of images.slice(0, Math.max(0, room))) {
            const prepared = await compressImage(file);
            if (prepared.size > MAX_UPLOAD_BYTES) {
                problems.push(`${file.name} is larger than 5 MB even after compression.`);
                continue;
            }
            added.push({ file: prepared, preview: URL.createObjectURL(prepared) });
        }
        setProcessing(false);

        if (problems.length) setError(problems.join(' '));
        if (added.length) onChange([...photos, ...added]);
    };

    const removePhoto = (index) => onChange(photos.filter((_, i) => i !== index));

    const onDrop = (event) => {
        event.preventDefault();
        setDragging(false);
        if (!disabled) addFiles(event.dataTransfer.files);
    };

    const canAdd = !disabled && !processing && photos.length < MAX_PHOTOS;

    return (
        <div>
            <label className="block text-sm font-medium mb-2">
                Photos of the work {required ? <span className="text-red-600">*</span> : '(optional)'}
            </label>

            <div
                onDragOver={(event) => {
                    event.preventDefault();
                    if (canAdd) setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`rounded-lg border-2 border-dashed p-5 text-center transition ${
                    dragging ? 'border-purple-500 bg-purple-50' : 'border-gray-300 bg-white'
                } ${canAdd ? '' : 'opacity-60'}`}
            >
                <ImagePlus className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-700">Drag photos here, or</p>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        disabled={!canAdd}
                        className="px-3 py-1.5 rounded-md bg-purple-600 text-white text-sm hover:bg-purple-700 disabled:cursor-not-allowed"
                    >
                        Choose photos
                    </button>
                    {/* Opens the camera directly on phones; desktop browsers fall back to a file picker */}
                    <button
                        type="button"
                        onClick={() => cameraRef.current?.click()}
                        disabled={!canAdd}
                        className="px-3 py-1.5 rounded-md border border-purple-600 text-purple-700 text-sm hover:bg-purple-50 disabled:cursor-not-allowed inline-flex items-center"
                    >
                        <Camera className="w-4 h-4 mr-1" /> Take photo
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    JPG, PNG or WebP · up to {MAX_PHOTOS} photos · large photos are resized automatically
                </p>
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                        addFiles(event.target.files);
                        event.target.value = ''; // allow picking the same file again after removing it
                    }}
                />
                <input
                    ref={cameraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(event) => {
                        addFiles(event.target.files);
                        event.target.value = '';
                    }}
                />
            </div>

            {processing && <p className="text-xs text-gray-600 mt-2">Preparing photos…</p>}
            {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

            {photos.length > 0 && (
                <div className="mt-3">
                    <p className="text-xs text-gray-600 mb-2">
                        {photos.length} of {MAX_PHOTOS} photos
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {photos.map((photo, index) => (
                            <div key={photo.preview} className="relative group">
                                {/* Local preview (object URL) of a photo not uploaded yet */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={photo.preview}
                                    alt={`Selected photo ${index + 1}`}
                                    className="w-full h-24 object-cover rounded-md border"
                                />
                                <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1 rounded">
                                    {formatSize(photo.file.size)}
                                </span>
                                {!disabled && (
                                    <button
                                        type="button"
                                        onClick={() => removePhoto(index)}
                                        aria-label={`Remove photo ${index + 1}`}
                                        className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Uploads selected photos to Supabase Storage through the backend and returns
 * their public URLs. Throws with the server's message on failure.
 */
export async function uploadProofPhotos(complaintId, photos, token) {
    if (photos.length === 0) return [];
    const form = new FormData();
    photos.forEach((photo) => form.append('photos', photo.file, photo.file.name));
    const response = await fetch(`/api/officer/complaints/${complaintId}/upload-proof-photos`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Photo upload failed');
    return data.urls;
}
