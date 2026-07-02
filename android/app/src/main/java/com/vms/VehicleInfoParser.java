package com.vms;

import android.util.Log;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;

public class VehicleInfoParser {
    private static final String TAG = "VehicleInfoParser";
    
    // Magic flags to identify the struct
    public static final int BEGIN_FLAG = 0x05a5a5a5; // 0x5a5a5a5
    public static final int END_FLAG = 0x5a5a5a5a;   // 0x5a5a5a5a

    public static class VehicleInfo {
        public boolean isValid = false;
        public String plate = "";
        public int plateConfidence = 0;
        public int vehicleColor = 0; // 0-unknown, 1-red, 2-orange, etc.
        public int plateColor = 0;   // 0-unknown, 1-blue, 2-yellow, 3-white, 4-black, 5-green, etc.
        public int vehicleType = 0;   // plateStyle
        public String owner = "";
        public int listType = 0;     // 0-unmatched, 1-stranger, 2-whitelist, 3-blacklist
        public int direction = 0;    // iVehicleDirect: 1 unknown, 2 approach, 3 leave
        public byte[] jpegData = null;
    }

    public static VehicleInfo parse(byte[] data) {
        VehicleInfo info = new VehicleInfo();
        if (data == null || data.length < 736) {
            return info;
        }

        ByteBuffer buffer = ByteBuffer.wrap(data);
        buffer.order(ByteOrder.LITTLE_ENDIAN);

        int beginFlag = buffer.getInt(0);
        int endFlag = buffer.getInt(732);

        // Debug log raw flags to help trace alignment issues on real devices
        Log.d(TAG, String.format("Parsing raw vehicle info: length=%d, begin_flag=0x%08x, end_flag=0x%08x", 
            data.length, beginFlag, endFlag));

        // Soft check on flags: log warning but proceed to decode
        if (beginFlag != BEGIN_FLAG && beginFlag != 0x5a5a5a5a) {
            Log.w(TAG, String.format("Begin flag mismatch: expected 0x%08x or 0x5a5a5a5a, got 0x%08x.", BEGIN_FLAG, beginFlag));
        }

        info.isValid = true;

        try {
            // 1. Plate: char[32] at offset 20
            byte[] plateBytes = new byte[32];
            buffer.position(20);
            buffer.get(plateBytes);
            info.plate = getNullTerminatedString(plateBytes);

            // 2. Plate Confidence: uint at offset 640
            info.plateConfidence = buffer.getInt(640);

            // 3. Plate Color: byte at offset 648
            info.plateColor = buffer.get(648) & 0xFF;

            // 4. Plate Style (Vehicle Type): byte at offset 649
            info.vehicleType = buffer.get(649) & 0xFF;

            // 5. Vehicle Color: byte at offset 651
            info.vehicleColor = buffer.get(651) & 0xFF;

            // 6. Jpeg Len: uint at offset 660
            int jpegLen = buffer.getInt(660);

            // 7. Owner: char[32] at offset 668
            byte[] ownerBytes = new byte[32];
            buffer.position(668);
            buffer.get(ownerBytes);
            info.owner = getNullTerminatedString(ownerBytes);

            // 8. List Type: int at offset 700
            info.listType = buffer.getInt(700);

            // 9. Vehicle Direct: byte at offset 725
            info.direction = buffer.get(725) & 0xFF;

            Log.d(TAG, String.format("Parsed Vehicle: plate=%s, conf=%d, color=%d, listType=%d, jpegLen=%d",
                info.plate, info.plateConfidence, info.vehicleColor, info.listType, jpegLen));

            // Extract embedded jpeg picture appended at offset 736
            if (jpegLen > 0 && data.length >= 736 + jpegLen) {
                byte[] jpeg = new byte[jpegLen];
                System.arraycopy(data, 736, jpeg, 0, jpegLen);
                info.jpegData = jpeg;
            } else if (data.length > 736) {
                // Fallback: extract all trailing bytes if jpegLen is missing/corrupted
                int remaining = data.length - 736;
                byte[] jpeg = new byte[remaining];
                System.arraycopy(data, 736, jpeg, 0, remaining);
                info.jpegData = jpeg;
                Log.w(TAG, "Using remaining fallback bytes for jpeg: " + remaining);
            }

        } catch (Exception e) {
            Log.e(TAG, "Error decoding vehicle metadata ByteBuffer", e);
            info.isValid = false;
        }

        return info;
    }

    private static String getNullTerminatedString(byte[] bytes) {
        int len = 0;
        while (len < bytes.length && bytes[len] != 0) {
            len++;
        }
        return new String(bytes, 0, len, StandardCharsets.UTF_8).trim();
    }
}
