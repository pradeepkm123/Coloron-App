package com.vms.pdf;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.pdf.PdfRenderer;
import android.os.ParcelFileDescriptor;
import android.util.AttributeSet;
import android.util.Log;
import android.widget.ImageView;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;

public class PdfView extends androidx.appcompat.widget.AppCompatImageView {
    private static final String TAG = "PdfView";
    private String fileName = "App File.pdf";
    private int pageIndex = 0;
    private PdfRenderer renderer;
    private ParcelFileDescriptor fileDescriptor;

    public PdfView(Context context) {
        super(context);
        init();
    }

    public PdfView(Context context, AttributeSet attrs) {
        super(context, attrs);
        init();
    }

    private void init() {
        setScaleType(ScaleType.FIT_CENTER);
        renderPage();
    }

    public void setFileName(String fileName) {
        if (fileName != null && !fileName.equals(this.fileName)) {
            this.fileName = fileName;
            renderPage();
        }
    }

    public void setPageIndex(int pageIndex) {
        if (pageIndex >= 0 && pageIndex != this.pageIndex) {
            this.pageIndex = pageIndex;
            renderPage();
        }
    }

    private void renderPage() {
        try {
            Context context = getContext();
            File cacheFile = new File(context.getCacheDir(), fileName);
            if (!cacheFile.exists()) {
                InputStream in = context.getAssets().open(fileName);
                FileOutputStream out = new FileOutputStream(cacheFile);
                byte[] buffer = new byte[1024 * 4];
                int read;
                while ((read = in.read(buffer)) != -1) {
                    out.write(buffer, 0, read);
                }
                out.flush();
                in.close();
                out.close();
            }

            cleanup();

            fileDescriptor = ParcelFileDescriptor.open(cacheFile, ParcelFileDescriptor.MODE_READ_ONLY);
            renderer = new PdfRenderer(fileDescriptor);

            if (pageIndex < 0 || pageIndex >= renderer.getPageCount()) {
                Log.e(TAG, "Invalid page index: " + pageIndex + ", total pages: " + renderer.getPageCount());
                return;
            }

            PdfRenderer.Page page = renderer.openPage(pageIndex);

            // Render page at 2.5x resolution for crispness
            int width = (int) (page.getWidth() * 2.5);
            int height = (int) (page.getHeight() * 2.5);
            Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
            
            bitmap.eraseColor(android.graphics.Color.WHITE);
            
            page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);
            setImageBitmap(bitmap);

            page.close();
        } catch (Exception e) {
            Log.e(TAG, "Error rendering PDF page: " + e.getMessage(), e);
        }
    }

    public void cleanup() {
        try {
            if (renderer != null) {
                renderer.close();
                renderer = null;
            }
            if (fileDescriptor != null) {
                fileDescriptor.close();
                fileDescriptor = null;
            }
        } catch (Exception ignored) {}
    }
}
