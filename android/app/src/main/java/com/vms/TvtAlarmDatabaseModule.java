package com.vms;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

public class TvtAlarmDatabaseModule extends ReactContextBaseJavaModule {
    private static final String TAG = "TvtAlarmDatabase";
    private static final String DATABASE_NAME = "TvtAlarms.db";
    private static final int DATABASE_VERSION = 1;
    private static final String TABLE_EVENTS = "AI_EVENTS";

    // Column Names
    private static final String KEY_ID = "id";
    private static final String KEY_TYPE = "type";
    private static final String KEY_NAME = "name";
    private static final String KEY_PLATE = "plate";
    private static final String KEY_CHANNEL = "channel";
    private static final String KEY_DEVICE_SN = "deviceSn";
    private static final String KEY_EVENT_TIME = "eventTime";
    private static final String KEY_SNAPSHOT_PATH = "snapshotPath";
    private static final String KEY_CONFIDENCE = "confidence";
    private static final String KEY_ROLE = "role";
    private static final String KEY_STATUS = "status";

    private final DatabaseHelper dbHelper;

    public TvtAlarmDatabaseModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.dbHelper = new DatabaseHelper(reactContext);
    }

    @Override
    public String getName() {
        return "TvtAlarmDatabaseModule";
    }

    @ReactMethod
    public void saveEvent(ReadableMap event, Promise promise) {
        try {
            SQLiteDatabase db = dbHelper.getWritableDatabase();
            ContentValues values = new ContentValues();
            
            values.put(KEY_ID, event.hasKey("id") ? event.getString("id") : String.valueOf(System.currentTimeMillis()));
            values.put(KEY_TYPE, event.hasKey("type") ? event.getString("type") : "");
            values.put(KEY_NAME, event.hasKey("name") ? event.getString("name") : "");
            values.put(KEY_PLATE, event.hasKey("plate") ? event.getString("plate") : "");
            values.put(KEY_CHANNEL, event.hasKey("channel") ? event.getInt("channel") : 0);
            values.put(KEY_DEVICE_SN, event.hasKey("deviceSn") ? event.getString("deviceSn") : "");
            
            // Allow both numeric timestamp and string timestamp
            if (event.hasKey("eventTime")) {
                try {
                    values.put(KEY_EVENT_TIME, event.getDouble("eventTime"));
                } catch (Exception e) {
                    try {
                        values.put(KEY_EVENT_TIME, Long.parseLong(event.getString("eventTime")));
                    } catch (Exception ex) {
                        values.put(KEY_EVENT_TIME, (double) System.currentTimeMillis());
                    }
                }
            } else {
                values.put(KEY_EVENT_TIME, (double) System.currentTimeMillis());
            }

            values.put(KEY_SNAPSHOT_PATH, event.hasKey("snapshotPath") ? event.getString("snapshotPath") : "");
            values.put(KEY_CONFIDENCE, event.hasKey("confidence") ? event.getInt("confidence") : 0);
            values.put(KEY_ROLE, event.hasKey("role") ? event.getString("role") : "");
            values.put(KEY_STATUS, event.hasKey("status") ? event.getString("status") : "unread");

            long rowId = db.insertWithOnConflict(TABLE_EVENTS, null, values, SQLiteDatabase.CONFLICT_REPLACE);
            if (rowId != -1) {
                promise.resolve(true);
            } else {
                promise.reject("DB_INSERT_FAILED", "Failed to insert event row.");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error saving event: ", e);
            promise.reject("DB_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void getEvents(Promise promise) {
        SQLiteDatabase db = null;
        Cursor cursor = null;
        try {
            db = dbHelper.getReadableDatabase();
            cursor = db.query(
                TABLE_EVENTS,
                null,
                null,
                null,
                null,
                null,
                KEY_EVENT_TIME + " DESC"
            );

            WritableArray array = Arguments.createArray();
            if (cursor != null && cursor.moveToFirst()) {
                do {
                    WritableMap map = Arguments.createMap();
                    map.putString("id", cursor.getString(cursor.getColumnIndexOrThrow(KEY_ID)));
                    map.putString("type", cursor.getString(cursor.getColumnIndexOrThrow(KEY_TYPE)));
                    map.putString("name", cursor.getString(cursor.getColumnIndexOrThrow(KEY_NAME)));
                    map.putString("plate", cursor.getString(cursor.getColumnIndexOrThrow(KEY_PLATE)));
                    map.putInt("channel", cursor.getInt(cursor.getColumnIndexOrThrow(KEY_CHANNEL)));
                    map.putString("deviceSn", cursor.getString(cursor.getColumnIndexOrThrow(KEY_DEVICE_SN)));
                    map.putDouble("eventTime", cursor.getDouble(cursor.getColumnIndexOrThrow(KEY_EVENT_TIME)));
                    map.putString("snapshotPath", cursor.getString(cursor.getColumnIndexOrThrow(KEY_SNAPSHOT_PATH)));
                    map.putInt("confidence", cursor.getInt(cursor.getColumnIndexOrThrow(KEY_CONFIDENCE)));
                    map.putString("role", cursor.getString(cursor.getColumnIndexOrThrow(KEY_ROLE)));
                    map.putString("status", cursor.getString(cursor.getColumnIndexOrThrow(KEY_STATUS)));
                    
                    // Add legacy properties for React Native side compatibility
                    map.putDouble("timestamp", cursor.getDouble(cursor.getColumnIndexOrThrow(KEY_EVENT_TIME)));
                    map.putString("deviceId", cursor.getString(cursor.getColumnIndexOrThrow(KEY_DEVICE_SN)));
                    map.putInt("channelId", cursor.getInt(cursor.getColumnIndexOrThrow(KEY_CHANNEL)));
                    
                    array.pushMap(map);
                } while (cursor.moveToNext());
            }
            promise.resolve(array);
        } catch (Exception e) {
            Log.e(TAG, "Error fetching events: ", e);
            promise.reject("DB_ERROR", e.getMessage(), e);
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }
    }

    @ReactMethod
    public void deleteEvent(String id, Promise promise) {
        try {
            SQLiteDatabase db = dbHelper.getWritableDatabase();
            int deleted = db.delete(TABLE_EVENTS, KEY_ID + "=?", new String[]{id});
            promise.resolve(deleted > 0);
        } catch (Exception e) {
            Log.e(TAG, "Error deleting event: ", e);
            promise.reject("DB_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void clearAllEvents(Promise promise) {
        try {
            SQLiteDatabase db = dbHelper.getWritableDatabase();
            db.delete(TABLE_EVENTS, null, null);
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Error clearing events: ", e);
            promise.reject("DB_ERROR", e.getMessage(), e);
        }
    }

    private static class DatabaseHelper extends SQLiteOpenHelper {
        public DatabaseHelper(Context context) {
            super(context, DATABASE_NAME, null, DATABASE_VERSION);
        }

        @Override
        public void onCreate(SQLiteDatabase db) {
            String createTableQuery = "CREATE TABLE " + TABLE_EVENTS + " (" +
                    KEY_ID + " TEXT PRIMARY KEY, " +
                    KEY_TYPE + " TEXT, " +
                    KEY_NAME + " TEXT, " +
                    KEY_PLATE + " TEXT, " +
                    KEY_CHANNEL + " INTEGER, " +
                    KEY_DEVICE_SN + " TEXT, " +
                    KEY_EVENT_TIME + " REAL, " +
                    KEY_SNAPSHOT_PATH + " TEXT, " +
                    KEY_CONFIDENCE + " INTEGER, " +
                    KEY_ROLE + " TEXT, " +
                    KEY_STATUS + " TEXT" +
                    ")";
            db.execSQL(createTableQuery);
            Log.d(TAG, "SQLite AI_EVENTS table created.");
        }

        @Override
        public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
            db.execSQL("DROP TABLE IF EXISTS " + TABLE_EVENTS);
            onCreate(db);
        }
    }
}
