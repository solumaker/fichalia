import React from 'react'
import { MapPin } from 'lucide-react'
import { TimeEntryUtils } from '../../utils/timeEntryUtils'
import { DateUtils } from '../../utils/dateUtils'

interface TimeEntriesHistoryProps {
  pairedEntries: PairedTimeEntry[]
}

export function TimeEntriesHistory({ pairedEntries }: TimeEntriesHistoryProps) {
  // Group entries by date
  const groupedByDate = TimeEntryUtils.groupPairedEntriesByDate(pairedEntries)

  return (
    <div className="space-y-6">
      {Object.entries(groupedByDate).map(([date, dayPairs]) => {
        const dailyDuration = dayPairs.reduce((total, pair) => total + (pair.duration || 0), 0)
        
        return (
          <div key={date} className="border border-gray-200 rounded-lg">
            {/* Day Header */}
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {DateUtils.formatDisplayDate(date)}
              </h3>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {TimeEntryUtils.formatTotalDuration(dailyDuration)}
              </span>
            </div>
            
            {/* Day Entries */}
            <div className="p-4 space-y-3">
              {dayPairs.map((pair, pairIndex) => (
                <div key={pairIndex} className="flex items-center gap-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
                    {/* Check In */}
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-green-500 mr-3" />
                          <span className="text-lg font-bold text-green-900">
                            {TimeEntryUtils.formatTimestamp(pair.checkIn.timestamp)}
                          </span>
                        </div>
                        {pair.checkIn.latitude && pair.checkIn.longitude && (
                          <a 
                            href={`https://www.google.com/maps/dir/?api=1&destination=${pair.checkIn.latitude},${pair.checkIn.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-green-700 hover:text-green-800 flex items-center"
                          >
                            <MapPin className="w-4 h-4 mr-1" />
                            Ver
                          </a>
                        )}
                      </div>
                    </div>
                    
                    {/* Check Out */}
                    {pair.checkOut ? (
                      <div className="bg-red-50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-red-500 mr-3" />
                            <div>
                              <span className="text-lg font-bold text-red-900">
                                {TimeEntryUtils.formatTimestamp(pair.checkOut.timestamp)}
                              </span>
                              {pair.isCrossMidnight && (
                                <div className="text-xs text-red-600 mt-1">
                                  {TimeEntryUtils.formatDate(pair.checkOut.timestamp)}
                                </div>
                              )}
                            </div>
                          </div>
                          {pair.checkOut.latitude && pair.checkOut.longitude && (
                            <a 
                              href={`https://www.google.com/maps/dir/?api=1&destination=${pair.checkOut.latitude},${pair.checkOut.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-red-700 hover:text-red-800 flex items-center"
                            >
                              <MapPin className="w-4 h-4 mr-1" />
                              Ver
                            </a>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <div className="w-3 h-3 rounded-full bg-gray-400 mx-auto mb-2" />
                          <p className="text-sm">Salida pendiente</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Duration for this pair */}
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {TimeEntryUtils.formatDuration(pair.duration)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}